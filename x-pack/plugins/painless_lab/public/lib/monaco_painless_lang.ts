/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monaco } from '@kbn/monaco';

/**
 * Extends the default type for a Monarch language so we can use
 * attribute references (like @keywords to reference the keywords list)
 * in the defined tokenizer
 */
interface Language extends monaco.languages.IMonarchLanguage {
  default: string;
  brackets: any;
  keywords: string[];
  symbols: RegExp;
  escapes: RegExp;
  digits: RegExp;
  primitives: string[];
  octaldigits: RegExp;
  binarydigits: RegExp;
  constants: string[];
  operators: string[];
}

export const monacoPainlessLang = {
  default: '',
  // painless does not use < >, so we define our own
  brackets: [
    ['{', '}', 'delimiter.curly'],
    ['[', ']', 'delimiter.square'],
    ['(', ')', 'delimiter.parenthesis'],
  ],
  keywords: [
    'if',
    'in',
    'else',
    'while',
    'do',
    'for',
    'continue',
    'break',
    'return',
    'new',
    'try',
    'catch',
    'throw',
    'this',
    'instanceof',
  ],
  primitives: ['void', 'boolean', 'byte', 'short', 'char', 'int', 'long', 'float', 'double', 'def'],
  constants: ['true', 'false'],
  operators: [
    '=',
    '>',
    '<',
    '!',
    '~',
    '?',
    '?:',
    '?.',
    ':',
    '==',
    '===',
    '<=',
    '>=',
    '!=',
    '!==',
    '&&',
    '||',
    '++',
    '--',
    '+',
    '-',
    '*',
    '/',
    '&',
    '|',
    '^',
    '%',
    '<<',
    '>>',
    '>>>',
    '+=',
    '-=',
    '*=',
    '/=',
    '&=',
    '|=',
    '^=',
    '%=',
    '<<=',
    '>>=',
    '>>>=',
    '->',
    '::',
    '=~',
    '==~',
  ],
  symbols: /[=><!~?:&|+\-*\/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  tokenizer: {
    root: [
      // identifiers and keywords
      [
        /[a-zA-Z_][\w]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@primitives': 'type',
            '@constants': 'constant',
            '@default': 'identifier',
          },
        },
      ],
      // whitespace
      [/[ \t\r\n]+/, '@whitespace'],
      // comments
      // [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
      // brackets
      [/[{}()\[\]]/, '@brackets'],
      // operators
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'operators',
            '@default': '',
          },
        },
      ],
      // numbers
      [/(@digits)[eE]([\-+]?(@digits))?[fFdD]?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?[fFdD]?/, 'number.float'],
      [/0[xX](@hexdigits)[Ll]?/, 'number.hex'],
      [/0(@octaldigits)[Ll]?/, 'number.octal'],
      [/0[bB](@binarydigits)[Ll]?/, 'number.binary'],
      [/(@digits)[fFdD]/, 'number.float'],
      [/(@digits)[lL]?/, 'number'],
      // delimiter: after numbers due to conflict with decimals and dot
      [/[;,.]/, 'delimiter'],
      // strings double quoted
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // string without termination
      [/"/, 'string', '@string_dq'],
      // strings single quoted
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // string without termination
      [/'/, 'string', '@string_sq'],
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
    string_dq: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],
    string_sq: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
  },
} as Language;
