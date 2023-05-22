/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import { getOsqueryTableNames } from './osquery_tables';

export const osqueryTables = getOsqueryTableNames();

export const keywords = [
  'select',
  'insert',
  'update',
  'delete',
  'from',
  'where',
  'and',
  'or',
  'group',
  'by',
  'order',
  'limit',
  'offset',
  'having',
  'as',
  'case',
  'when',
  'else',
  'end',
  'type',
  'left',
  'right',
  'join',
  'on',
  'outer',
  'desc',
  'asc',
  'union',
  'create',
  'table',
  'primary',
  'key',
  'if',
  'foreign',
  'not',
  'references',
  'default',
  'null',
  'inner',
  'cross',
  'natural',
  'database',
  'drop',
  'grant',
];

export const builtinConstants = ['true', 'false'];

export const builtinFunctions = [
  'avg',
  'count',
  'first',
  'last',
  'max',
  'min',
  'sum',
  'ucase',
  'lcase',
  'mid',
  'len',
  'round',
  'rank',
  'now',
  'format',
  'coalesce',
  'ifnull',
  'isnull',
  'nvl',
];

export const dataTypes = [
  'int',
  'numeric',
  'decimal',
  'date',
  'varchar',
  'char',
  'bigint',
  'float',
  'double',
  'bit',
  'binary',
  'text',
  'set',
  'timestamp',
  'money',
  'real',
  'number',
  'integer',
];

interface Range {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface IDisposable {
  dispose: () => void;
}

const theme = {
  base: 'vs' as const,
  inherit: false,
  rules: [
    { token: 'osquery-token' },
    { token: 'support.function', foreground: '4271AE' },
    { token: 'keyword', foreground: '8959A8' },
    { token: 'storage.type', foreground: '8959A8' },
    { token: 'constant.language', foreground: 'F5871F' },
    { token: 'comment', foreground: '8E908C' },
    { token: 'string', foreground: '718C00' },
    { token: 'constant.numeric', foreground: 'F5871F' },
    { token: 'keyword.operator', foreground: '3E999F' },
  ],
  colors: {},
};

export const initializeOsqueryEditor = () => {
  let disposable: IDisposable | null = null;
  // or make sure that it exists by other ways
  if (monaco) {
    disposable = monaco.languages.onLanguage('sql', () => {
      monaco.languages.setMonarchTokensProvider('sql', {
        ignoreCase: true,
        osqueryTables,
        builtinFunctions,
        keywords,
        builtinConstants,
        dataTypes,
        tokenizer: {
          root: [
            [
              '[a-zA-Z_$][a-zA-Z0-9_$]*\\b',
              {
                cases: {
                  '@osqueryTables': 'osquery-token',
                  '@builtinFunctions': 'support.function',
                  '@keywords': 'keyword',
                  '@builtinConstants': 'constant.language',
                  '@dataTypes': 'storage.type',
                },
              },
            ],
            ['[a-zA-Z_$][a-zA-Z0-9_$]*\\b', 'identifier'],
            ['--.*$', 'comment'],
            ['/\\*.*\\*/', 'comment'],
            ['".*?"', 'string'],
            ["'.*?'", 'string'],
            ['[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b', 'constant.numeric'],
            ['\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|=', 'keyword.operator'],
            ['[\\(]', 'paren.lparen'],
            ['[\\)]', 'paren.rparen'],
            ['\\s+', 'text'],
          ],
        },
      });
      monaco?.editor.defineTheme('osquery', theme);
      monaco?.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          return getEditorAutoCompleteSuggestion(range);
        },
      });
    });

    return disposable;
  }
};

export const getEditorAutoCompleteSuggestion = (
  range: Range
): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
  const suggestionsFromDefaultKeywords = keywords.map((kw) => ({
    label: `${kw.toUpperCase()}`,
    kind: monaco.languages.CompletionItemKind.Keyword,
    detail: 'Keyword',
    insertText: `${kw.toUpperCase()} `,
    range,
  }));
  const tableNameKeywords = osqueryTables.map((tableName: string) => ({
    label: tableName,
    kind: monaco.languages.CompletionItemKind.Folder,
    detail: 'Osquery',
    insertText: tableName,
    range,
  }));
  const builtinConstantsKeywords = builtinConstants.map((constant: string) => ({
    label: constant,
    kind: monaco.languages.CompletionItemKind.Constant,
    detail: 'Constant',
    insertText: constant,
    range,
  }));
  const builtinFunctionsKeywords = builtinFunctions.map((builtinFunction: string) => ({
    label: builtinFunction,
    kind: monaco.languages.CompletionItemKind.Function,
    detail: 'Function',
    insertText: builtinFunction,
    range,
  }));
  const dataTypesKeywords = dataTypes.map((dataType: string) => ({
    label: dataType,
    kind: monaco.languages.CompletionItemKind.TypeParameter,
    detail: 'Type',
    insertText: dataType,
    range,
  }));

  return {
    suggestions: [
      ...suggestionsFromDefaultKeywords,
      ...tableNameKeywords,
      ...builtinConstantsKeywords,
      ...builtinFunctionsKeywords,
      ...dataTypesKeywords,
    ],
  };
};
