!function(n,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define("jsonLogic",[],e):"object"==typeof exports?exports.jsonLogic=e():n.jsonLogic=e()}("undefined"!=typeof self?self:this,function(){return function(n){var e={};function r(t){if(e[t])return e[t].exports;var o=e[t]={i:t,l:!1,exports:{}};return n[t].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=n,r.c=e,r.d=function(n,e,t){r.o(n,e)||Object.defineProperty(n,e,{configurable:!1,enumerable:!0,get:t})},r.r=function(n){Object.defineProperty(n,"__esModule",{value:!0})},r.n=function(n){var e=n&&n.__esModule?function(){return n.default}:function(){return n};return r.d(e,"a",e),e},r.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},r.p="",r(r.s="./src/index.js")}({"./src/core.js":
/*!*********************!*\
  !*** ./src/core.js ***!
  \*********************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nvar _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };\n\n/**\n * This module establishes the core methods on JsonLogic.\n * These methods can be used by operations, so we\'re breaking this into a dependency that they can load separately to prevent a circular dependency.\n */\n\nif (!Array.isArray) {\n    Array.isArray = function (arg) {\n        return Object.prototype.toString.call(arg) === "[object Array]";\n    };\n}\nif (!Array.from) {\n    Array.from = function (wanna_be) {\n        return [].slice.call(wanna_be);\n    };\n}\n\n/**\n* Return an array that contains no duplicates (original not modified)\n* @param  {array} array   Original reference array\n* @return {array}         New array with no duplicates\n*/\nfunction arrayUnique(array) {\n    var a = [];\n    for (var i = 0, l = array.length; i < l; i++) {\n        if (a.indexOf(array[i]) === -1) {\n            a.push(array[i]);\n        }\n    }\n    return a;\n}\n\nvar jsonLogic = {};\nvar operations = {};\n\njsonLogic.is_logic = function (logic) {\n    return (typeof logic === "undefined" ? "undefined" : _typeof(logic)) === "object" && // An object\n    logic !== null && // but not null\n    !Array.isArray(logic) && // and not an array\n    Object.keys(logic).length === 1 // with exactly one key\n    ;\n};\n\n/*\nThis helper will defer to the JsonLogic spec as a tie-breaker when different language interpreters define different behavior for the truthiness of primitives.  E.g., PHP considers empty arrays to be falsy, but Javascript considers them to be truthy. JsonLogic, as an ecosystem, needs one consistent answer.\n\nSpec and rationale here: http://jsonlogic.com/truthy\n*/\njsonLogic.truthy = function (value) {\n    if (Array.isArray(value) && value.length === 0) {\n        return false;\n    }\n    return !!value;\n};\n\njsonLogic.get_operator = function (logic) {\n    return Object.keys(logic)[0];\n};\n\njsonLogic.get_values = function (logic) {\n    return logic[jsonLogic.get_operator(logic)];\n};\n\njsonLogic.apply = function (logic, data) {\n    // Does this array contain logic? Only one way to find out.\n    if (Array.isArray(logic)) {\n        return logic.map(function (l) {\n            return jsonLogic.apply(l, data);\n        });\n    }\n    // You\'ve recursed to a primitive, stop!\n    if (!jsonLogic.is_logic(logic)) {\n        return logic;\n    }\n\n    data = data || {};\n\n    var op = jsonLogic.get_operator(logic);\n    var values = logic[op];\n    var operation;\n\n    // easy syntax for unary operators, like {"var" : "x"} instead of strict {"var" : ["x"]}\n    if (!Array.isArray(values)) {\n        values = [values];\n    }\n\n    // The operation is called with "data" bound to its "this" and "values" passed as arguments.\n    // Structured commands like % or > can name formal arguments while flexible commands (like missing or merge) can operate on the pseudo-array arguments\n    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments\n    if (typeof operations[op] === \'function\') {\n        operation = operations[op];\n    } else {\n        var sub_ops = String(op).split(".");\n        operation = operations;\n        for (var i = 0; i < sub_ops.length; i++) {\n            // Descending into operations\n            operation = operation[sub_ops[i]];\n            if (operation === undefined) {\n                throw new Error("Unrecognized operation " + op + " (failed at " + sub_ops.slice(0, i + 1).join(".") + ")");\n            }\n        }\n    }\n\n    // If the operation explicitly wants to manage its own recursion, let it, otherwise handle that now.\n    if (!operation.manages_own_recursion) {\n        values = values.map(function (val) {\n            return jsonLogic.apply(val, data);\n        });\n    }\n\n    return operation.apply(data, values);\n};\n\njsonLogic.uses_data = function (logic) {\n    var collection = [];\n\n    if (jsonLogic.is_logic(logic)) {\n        var op = jsonLogic.get_operator(logic);\n        var values = logic[op];\n\n        if (!Array.isArray(values)) {\n            values = [values];\n        }\n\n        if (op === "var") {\n            // This doesn\'t cover the case where the arg to var is itself a rule.\n            collection.push(values[0]);\n        } else {\n            // Recursion!\n            values.map(function (val) {\n                collection.push.apply(collection, jsonLogic.uses_data(val));\n            });\n        }\n    }\n\n    return arrayUnique(collection);\n};\n\n/**\n* Add an operation\n* @param  {string} name\n* @param  {function} code\n* @param  {boolean} manages_own_recursion\n*     If false or undefined, JsonLogic will recur into arguments *before* code() is called. This is typical, like "+"\n*     If true, this code needs to manage its own recursion. This is unusual, like "if", but lets you control execution.\n*/\njsonLogic.add_operation = function (name, code, manages_own_recursion) {\n    operations[name] = code;\n    if (manages_own_recursion) {\n        // The third parameter can set it true, but it could also be set as a parameter on code, e.g. when importing a bundle\n        operations[name].manages_own_recursion = true;\n    }\n};\n\n/**\n * Add several operations into the global namespace.\n * Expects an object with string keys and function values.\n *\n * Note, if these operations need to manage their own recursion, you can set a .manages_own_recursion property on the functions, see src/operations/control_structures.js\n * @param  {object} bundle\n */\njsonLogic.add_operations = function (bundle) {\n    for (var operation in bundle) {\n        jsonLogic.add_operation(operation, bundle[operation]);\n    }\n};\n\njsonLogic.rm_operation = function (name) {\n    delete operations[name];\n};\n\njsonLogic.rule_like = function (rule, pattern) {\n    // console.log("Is ". JSON.stringify(rule) . " like " . JSON.stringify(pattern) . "?");\n    if (pattern === rule) {\n        return true;\n    } // TODO : Deep object equivalency?\n    if (pattern === "@") {\n        return true;\n    } // Wildcard!\n    if (pattern === "number") {\n        return typeof rule === "number";\n    }\n    if (pattern === "string") {\n        return typeof rule === "string";\n    }\n    if (pattern === "array") {\n        // !logic test might be superfluous in JavaScript\n        return Array.isArray(rule) && !jsonLogic.is_logic(rule);\n    }\n\n    if (jsonLogic.is_logic(pattern)) {\n        if (jsonLogic.is_logic(rule)) {\n            var pattern_op = jsonLogic.get_operator(pattern);\n            var rule_op = jsonLogic.get_operator(rule);\n\n            if (pattern_op === "@" || pattern_op === rule_op) {\n                // echo "\\nOperators match, go deeper\\n";\n                return jsonLogic.rule_like(jsonLogic.get_values(rule, false), jsonLogic.get_values(pattern, false));\n            }\n        }\n        return false; // pattern is logic, rule isn\'t, can\'t be eq\n    }\n\n    if (Array.isArray(pattern)) {\n        if (Array.isArray(rule)) {\n            if (pattern.length !== rule.length) {\n                return false;\n            }\n            /*\n            Note, array order MATTERS, because we\'re using this array test logic to consider arguments, where order can matter. (e.g., + is commutative, but \'-\' or \'if\' or \'var\' are NOT)\n            */\n            for (var i = 0; i < pattern.length; i += 1) {\n                // If any fail, we fail\n                if (!jsonLogic.rule_like(rule[i], pattern[i])) {\n                    return false;\n                }\n            }\n            return true; // If they *all* passed, we pass\n        } else {\n            return false; // Pattern is array, rule isn\'t\n        }\n    }\n\n    // Not logic, not array, not a === match for rule.\n    return false;\n};\n\njsonLogic.add_operation("?:", function () {\n    return jsonLogic.apply({ "if": Array.from(arguments) }, this);\n}, true);\n\n// https://github.com/webpack/webpack/issues/706#issuecomment-167908576\nmodule.exports = jsonLogic;\n\n//# sourceURL=webpack://jsonLogic/./src/core.js?')},"./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nvar _core = __webpack_require__(/*! ./core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nvar _array = __webpack_require__(/*! ./operations/array */ "./src/operations/array.js");\n\nvar _array2 = _interopRequireDefault(_array);\n\nvar _control_structures = __webpack_require__(/*! ./operations/control_structures */ "./src/operations/control_structures.js");\n\nvar _control_structures2 = _interopRequireDefault(_control_structures);\n\nvar _data = __webpack_require__(/*! ./operations/data */ "./src/operations/data.js");\n\nvar _data2 = _interopRequireDefault(_data);\n\nvar _math = __webpack_require__(/*! ./operations/math */ "./src/operations/math.js");\n\nvar _math2 = _interopRequireDefault(_math);\n\nvar _method = __webpack_require__(/*! ./operations/method */ "./src/operations/method.js");\n\nvar _method2 = _interopRequireDefault(_method);\n\nvar _string = __webpack_require__(/*! ./operations/string */ "./src/operations/string.js");\n\nvar _string2 = _interopRequireDefault(_string);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n_core2.default.add_operations(_array2.default);\n\n_core2.default.add_operations(_control_structures2.default);\n\n_core2.default.add_operations(_data2.default);\n\n_core2.default.add_operations(_math2.default);\n\n_core2.default.add_operations(_method2.default);\n\n_core2.default.add_operations(_string2.default);\n\n// https://github.com/webpack/webpack/issues/706#issuecomment-167908576\nmodule.exports = _core2.default;\n\n//# sourceURL=webpack://jsonLogic/./src/index.js?')},"./src/operations/array.js":
/*!*********************************!*\
  !*** ./src/operations/array.js ***!
  \*********************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n    value: true\n});\n\nvar _core = __webpack_require__(/*! ../core */ \"./src/core.js\");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar filter = function filter() {\n    var scopedData = _core2.default.apply(arguments[0], this);\n    var scopedLogic = arguments[1];\n\n    if (!Array.isArray(scopedData)) {\n        return [];\n    }\n    // Return only the elements from the array in the first argument,\n    // that return truthy when passed to the logic in the second argument.\n    // For parity with JavaScript, reindex the returned array\n    return scopedData.filter(function (datum) {\n        return _core2.default.truthy(_core2.default.apply(scopedLogic, datum));\n    });\n};\nfilter.manages_own_recursion = true;\n\nvar map = function map() {\n    var scopedData = _core2.default.apply(arguments[0], this);\n    var scopedLogic = arguments[1];\n\n    if (!Array.isArray(scopedData)) {\n        return [];\n    }\n\n    return scopedData.map(function (datum) {\n        return _core2.default.apply(scopedLogic, datum);\n    });\n};\nmap.manages_own_recursion = true;\n\nvar reduce = function reduce() {\n    var scopedData = _core2.default.apply(arguments[0], this);\n    var scopedLogic = arguments[1];\n    var initial = typeof arguments[2] !== 'undefined' ? arguments[2] : null;\n\n    if (!Array.isArray(scopedData)) {\n        return initial;\n    }\n\n    return scopedData.reduce(function (accumulator, current) {\n        return _core2.default.apply(scopedLogic, { 'current': current, 'accumulator': accumulator });\n    }, initial);\n};\nreduce.manages_own_recursion = true;\n\nvar all = function all() {\n    var scopedData = _core2.default.apply(arguments[0], this);\n    var scopedLogic = arguments[1];\n    // All of an empty set is false. Note, some and none have correct fallback after the for loop\n    if (!scopedData.length) {\n        return false;\n    }\n    for (var i = 0; i < scopedData.length; i += 1) {\n        if (!_core2.default.truthy(_core2.default.apply(scopedLogic, scopedData[i]))) {\n            return false; // First falsy, short circuit\n        }\n    }\n    return true; // All were truthy\n};\nall.manages_own_recursion = true;\n\nvar none = function none() {\n    var filtered = _core2.default.apply({ 'filter': Array.from(arguments) }, this);\n    return filtered.length === 0;\n};\nnone.manages_own_recursion = true;\n\nvar some = function some() {\n    var filtered = _core2.default.apply({ 'filter': Array.from(arguments) }, this);\n    return filtered.length > 0;\n};\nsome.manages_own_recursion = true;\n\nexports.default = {\n    \"merge\": function merge() {\n        return Array.prototype.reduce.call(arguments, function (a, b) {\n            return a.concat(b);\n        }, []);\n    },\n\n    filter: filter,\n    map: map,\n    reduce: reduce,\n    all: all,\n    none: none,\n    some: some\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/array.js?")},"./src/operations/control_structures.js":
/*!**********************************************!*\
  !*** ./src/operations/control_structures.js ***!
  \**********************************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nvar _core = __webpack_require__(/*! ../core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// \'if\', \'and\', and \'or\' violate the normal rule of depth-first calculating consequents, let each manage recursion as needed.\n\nvar _if = function _if() {\n    /* \'if\' should be called with an odd number of parameters, 3 or greater\n    This works on the pattern:\n    if( 0 ){ 1 }else{ 2 };\n    if( 0 ){ 1 }else if( 2 ){ 3 }else{ 4 };\n    if( 0 ){ 1 }else if( 2 ){ 3 }else if( 4 ){ 5 }else{ 6 };\n     The implementation is:\n    For pairs of arguments (0,1 then 2,3 then 4,5 etc)\n    If the first evaluates truthy, evaluate and return the second\n    If the first evaluates falsy, jump to the next pair (e.g, 0,1 to 2,3)\n    given one parameter, evaluate and return it. (it\'s an Else and all the If/ElseIf were false)\n    given 0 parameters, return NULL (not great practice, but there was no Else)\n    */\n    for (var i = 0; i < arguments.length - 1; i += 2) {\n        if (_core2.default.truthy(_core2.default.apply(arguments[i], this))) {\n            return _core2.default.apply(arguments[i + 1], this);\n        }\n    }\n    if (arguments.length === i + 1) {\n        return _core2.default.apply(arguments[i], this);\n    }\n    return null;\n};\n_if.manages_own_recursion = true;\n\n// The ternary ?: operator was implemented and documented first, but\n// it made more sense to make it a synonym for "if" once "if" existed\nvar ternary = function ternary() {\n    return _core2.default.apply({ "if": Array.from(arguments) });\n};\nternary.manages_own_recursion = true;\n\n// Return first falsy, or last\nvar _and = function _and() {\n    var current;\n    for (var i = 0; i < arguments.length; i += 1) {\n        current = _core2.default.apply(arguments[i], this);\n        if (!_core2.default.truthy(current)) {\n            return current;\n        }\n    }\n    return current; // Last\n};\n_and.manages_own_recursion = true;\n\n// Return first truthy, or last\nvar _or = function _or() {\n    var current;\n    for (var i = 0; i < arguments.length; i += 1) {\n        current = _core2.default.apply(arguments[i], this);\n        if (_core2.default.truthy(current)) {\n            return current;\n        }\n    }\n    return current; // Last\n};\n_or.manages_own_recursion = true;\n\nmodule.exports = {\n    "if": _if,\n    "?:": ternary,\n    "and": _and,\n    "or": _or\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/control_structures.js?')},"./src/operations/data.js":
/*!********************************!*\
  !*** ./src/operations/data.js ***!
  \********************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nObject.defineProperty(exports, "__esModule", {\n    value: true\n});\n\nvar _core = __webpack_require__(/*! ../core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nexports.default = {\n    "var": function _var(a, b) {\n        var not_found = b === undefined ? null : b;\n        var data = this;\n        if (typeof a === "undefined" || a === "" || a === null) {\n            return data;\n        }\n        var sub_props = String(a).split(".");\n        for (var i = 0; i < sub_props.length; i++) {\n            if (data === null) {\n                return not_found;\n            }\n            // Descending into data\n            data = data[sub_props[i]];\n            if (data === undefined) {\n                return not_found;\n            }\n        }\n        return data;\n    },\n    "missing": function missing() {\n        /*\n        Missing can receive many keys as many arguments, like {"missing:[1,2]}\n        Missing can also receive *one* argument that is an array of keys,\n        which typically happens if it\'s actually acting on the output of another command\n        (like \'if\' or \'merge\')\n        */\n\n        var missing = [];\n        var keys = Array.isArray(arguments[0]) ? arguments[0] : arguments;\n\n        for (var i = 0; i < keys.length; i++) {\n            var key = keys[i];\n            var value = _core2.default.apply({ "var": key }, this);\n            if (value === null || value === "") {\n                missing.push(key);\n            }\n        }\n\n        return missing;\n    },\n    "missing_some": function missing_some(need_count, options) {\n        // missing_some takes two arguments, how many (minimum) items must be present, and an array of keys (just like \'missing\') to check for presence.\n        var are_missing = _core2.default.apply({ "missing": options }, this);\n\n        if (options.length - are_missing.length >= need_count) {\n            return [];\n        } else {\n            return are_missing;\n        }\n    }\n\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/data.js?')},"./src/operations/math.js":
/*!********************************!*\
  !*** ./src/operations/math.js ***!
  \********************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nObject.defineProperty(exports, "__esModule", {\n    value: true\n});\n\nvar _core = __webpack_require__(/*! ../core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nexports.default = {\n    "+": function _() {\n        return Array.prototype.reduce.call(arguments, function (a, b) {\n            return parseFloat(a, 10) + parseFloat(b, 10);\n        }, 0);\n    },\n    "*": function _() {\n        return Array.prototype.reduce.call(arguments, function (a, b) {\n            return parseFloat(a, 10) * parseFloat(b, 10);\n        });\n    },\n    "-": function _(a, b) {\n        if (b === undefined) {\n            return -a;\n        } else {\n            return a - b;\n        }\n    },\n    "/": function _(a, b) {\n        return a / b;\n    },\n    "%": function _(a, b) {\n        return a % b;\n    },\n    "min": function min() {\n        return Math.min.apply(this, arguments);\n    },\n    "max": function max() {\n        return Math.max.apply(this, arguments);\n    },\n    "==": function _(a, b) {\n        /* jshint eqeqeq:false */\n        return a == b;\n    },\n    "===": function _(a, b) {\n        return a === b;\n    },\n    "!=": function _(a, b) {\n        /* jshint eqeqeq:false */\n        return a != b;\n    },\n    "!==": function _(a, b) {\n        return a !== b;\n    },\n    ">": function _(a, b) {\n        return a > b;\n    },\n    ">=": function _(a, b) {\n        return a >= b;\n    },\n    "<": function _(a, b, c) {\n        return c === undefined ? a < b : a < b && b < c;\n    },\n    "<=": function _(a, b, c) {\n        return c === undefined ? a <= b : a <= b && b <= c;\n    },\n    "!!": function _(a) {\n        return _core2.default.truthy(a);\n    },\n    "!": function _(a) {\n        return !_core2.default.truthy(a);\n    }\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/math.js?')},"./src/operations/method.js":
/*!**********************************!*\
  !*** ./src/operations/method.js ***!
  \**********************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nObject.defineProperty(exports, "__esModule", {\n    value: true\n});\n\nvar _core = __webpack_require__(/*! ../core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nexports.default = {\n    "method": function method(obj, _method, args) {\n        return obj[_method].apply(obj, args);\n    },\n    "log": function log(a) {\n        console.log(a);return a;\n    }\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/method.js?')},"./src/operations/string.js":
/*!**********************************!*\
  !*** ./src/operations/string.js ***!
  \**********************************/
/*! no static exports found */function(module,exports,__webpack_require__){"use strict";eval('\n\nObject.defineProperty(exports, "__esModule", {\n    value: true\n});\n\nvar _core = __webpack_require__(/*! ../core */ "./src/core.js");\n\nvar _core2 = _interopRequireDefault(_core);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nexports.default = {\n    "in": function _in(a, b) {\n        if (!b || typeof b.indexOf === "undefined") {\n            return false;\n        }\n        return b.indexOf(a) !== -1;\n    },\n    "cat": function cat() {\n        return Array.prototype.join.call(arguments, "");\n    },\n    "substr": function substr(source, start, end) {\n        if (end < 0) {\n            // JavaScript doesn\'t support negative end, this emulates PHP behavior\n            var temp = String(source).substr(start);\n            return temp.substr(0, temp.length + end);\n        }\n        return String(source).substr(start, end);\n    }\n};\n\n//# sourceURL=webpack://jsonLogic/./src/operations/string.js?')}})});