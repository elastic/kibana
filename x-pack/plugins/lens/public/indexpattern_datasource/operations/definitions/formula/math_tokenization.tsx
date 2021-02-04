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

export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  ignoreCase: true,
  brackets: [{ open: '(', close: ')', token: 'delimiter.parenthesis' }],
  tokenizer: {
    root: [
      [/\s+/, 'whitespace'],
      [/[a-zA-Z0-9][a-zA-Z0-9_\-\.]*/, 'identifier'],
      [/[,=]/, 'delimiter'],
      [/-?(\d*\.)?\d+([eE][+\-]?\d+)?/, 'number'],
      [/".+?"/, 'string'],
      [/'.+?'/, 'string'],
      [/\+|\-|\*|\//, 'keyword.operator'],
      [/[\(]/, 'paren.lparen'],
      [/[\)]/, 'paren.rparen'],
    ],
  },
};

monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, lexerRules);
monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);
