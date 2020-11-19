/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monaco } from '@kbn/monaco';
import { ExpressionFunction } from '../../types';

export const LANGUAGE_ID = 'canvas-expression';

/**
 * Extends the default type for a Monarch language so we can use
 * attribute references (like @keywords to reference the keywords list)
 * in the defined tokenizer
 */
interface Language extends monaco.languages.IMonarchLanguage {
  keywords: string[];
  symbols: RegExp;
  escapes: RegExp;
  digits: RegExp;
  boolean: ['true', 'false'];
  null: ['null'];
}

/**
 * Defines the Monarch tokenizer for syntax highlighting in Monaco of the
 * expression language. The tokenizer defines a set of regexes and actions/tokens
 * to mark the detected words/characters.
 * For more information, the Monarch documentation can be found here:
 * https://microsoft.github.io/monaco-editor/monarch.html
 */
export const language: Language = {
  keywords: [],

  symbols: /[=|]/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  boolean: ['true', 'false'],
  null: ['null'],

  tokenizer: {
    root: [
      [/[{}]/, 'delimiter.bracket'],
      {
        include: 'common',
      },
    ],

    common: [
      // arguments (some args share the same name as functions which are keywords)
      [/[a-z_$][\w$]*=/, 'identifier'],

      // identifiers and keywords
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@null': 'keyword',
            '@boolean': 'keyword',
            '@default': 'identifier',
          },
        },
      ],

      [/(@digits)/, 'number'],

      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],

      [/@symbols/, 'delimiter'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],
  },
};

export function registerLanguage(functions: ExpressionFunction[]) {
  language.keywords = functions.map((fn) => fn.name);

  monaco.languages.register({ id: LANGUAGE_ID });
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, language);
}
