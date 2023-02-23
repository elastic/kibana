/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';

export const LANGUAGE_ID = 'lens_math';
monaco.languages.register({ id: LANGUAGE_ID });

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  wordPattern: /[^()'"\s]+/g,
  brackets: [['(', ')']],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: `'`, close: `'` },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: `'`, close: `'` },
    { open: '"', close: '"' },
  ],
};

export const lexerRules = {
  defaultToken: 'invalid',
  tokenPostfix: '',
  ignoreCase: true,
  brackets: [{ open: '(', close: ')', token: 'delimiter.parenthesis' }],
  escapes: /\\(?:[\\"'])/,
  tokenizer: {
    root: [
      [/\s+/, 'whitespace'],
      [/-?(\d*\.)?\d+([eE][+\-]?\d+)?/, 'number'],
      [/[a-zA-Z0-9][a-zA-Z0-9_\-\.]*/, 'keyword'],
      [/[,=:]/, 'delimiter'],
      // strings double quoted
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // string without termination
      [/"/, 'string', '@string_dq'],
      // strings single quoted
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // string without termination
      [/'/, 'string', '@string_sq'],
      [/\+|\-|\*|\//, 'keyword.operator'],
      [/[\(]/, 'delimiter'],
      [/[\)]/, 'delimiter'],
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
} as monaco.languages.IMonarchLanguage;

monaco.languages.onLanguage(LANGUAGE_ID, () => {
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, lexerRules);
  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);
});
