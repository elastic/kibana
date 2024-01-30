/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import { findLast, map, uniqBy } from 'lodash';
import { getOsqueryTableNames, osqueryTablesRecord } from './osquery_tables';

export const osqueryTableNames = getOsqueryTableNames();

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
    { token: 'osquery' },
    { token: 'support.function', foreground: '4271AE' },
    { token: 'keyword', foreground: '8959A8' },
    { token: 'storage.type', foreground: '8959A8' },
    { token: 'constant.language', foreground: 'F5871F' },
    { token: 'comment', foreground: '8E908C' },
    { token: 'string', foreground: '718C00' },
    { token: 'constant.numeric', foreground: 'F5871F' },
    { token: 'keyword.operator', foreground: '3E999F' },
  ],
  colors: {
    'editorGutter.background': '#F6F6F6',
  },
};

export const initializeOsqueryEditor = () => {
  let disposable: IDisposable | null = null;
  if (monaco) {
    monaco?.editor.defineTheme('osquery', theme);
    disposable = monaco.languages.onLanguage('sql', () => {
      monaco.languages.setMonarchTokensProvider('sql', {
        ignoreCase: true,
        osqueryTableNames,
        builtinFunctions,
        keywords,
        builtinConstants,
        dataTypes,
        brackets: [
          { open: '[', close: ']', token: 'delimiter.square' },
          { open: '(', close: ')', token: 'delimiter.parenthesis' },
        ],
        tokenizer: {
          root: [
            [
              '[a-zA-Z_$][a-zA-Z0-9_$]*\\b',
              {
                cases: {
                  '@osqueryTableNames': 'osquery',
                  '@builtinFunctions': 'support.function',
                  '@keywords': 'keyword',
                  '@builtinConstants': 'constant.language',
                  '@dataTypes': 'storage.type',
                },
              },
            ],
            ['--.*$', 'comment'],
            ['/\\*.*\\*/', 'comment'],
            ['".*?"', 'string'],
            ["'.*?'", 'string'],
            [/[ \t\r\n]+/, { token: 'whitespace' }],
            ['[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b', 'constant.numeric'],
            ['\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|=', 'keyword.operator'],
            ['[\\(]', 'paren.lparen'],
            ['[\\)]', 'paren.rparen'],
            ['\\s+', 'text'],
          ],
        },
      });
      monaco?.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: ['.'],
        provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
          const value = model.getValue();
          const tokens = monaco.editor.tokenize(value, 'sql');
          const findOsqueryToken = findLast(
            tokens[position.lineNumber - 1],
            (token) => token.type === 'osquery.sql'
          );

          const osqueryTable = model.getWordAtPosition({
            lineNumber: position.lineNumber,
            column: (findOsqueryToken?.offset || 0) + 1,
          });

          const lineContent = model.getLineContent(position.lineNumber);

          const word = model.getWordUntilPosition(position);

          const isDot =
            lineContent.charAt(lineContent.length - 1) === '.' ||
            lineContent.charAt(lineContent.length - 2) === '.';

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          return getEditorAutoCompleteSuggestion(range, value, isDot, osqueryTable?.word);
        },
      });
    });

    return disposable;
  }
};

const regex = /\s*[\s,]\s*/;
export const getEditorAutoCompleteSuggestion = (
  range: Range,
  value: string,
  isDot: boolean,
  name?: string
): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
  // we do not want to suggest the last word (currently being typed)
  const localValue = value.split(regex).slice(0, -1);
  const localKeywords = localValue.map((kw) => ({
    label: kw,
    kind: monaco.languages.CompletionItemKind.Snippet,
    detail: 'Local',
    insertText: kw,
    range,
  }));

  const suggestionsFromDefaultKeywords = keywords.map((kw) => ({
    label: `${kw.toUpperCase()}`,
    kind: monaco.languages.CompletionItemKind.Keyword,
    detail: 'Keyword',
    insertText: `${kw.toUpperCase()} `,
    range,
  }));

  const osqueryColumns = name
    ? map(osqueryTablesRecord[name]?.columns, ({ name: columnName }) => ({
        label: columnName,
        kind: monaco.languages.CompletionItemKind.Folder,
        detail: `${name} column`,
        insertText: columnName,
        range,
      }))
    : [];

  const tableNameKeywords = osqueryTableNames.map((tableName: string) => ({
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
    suggestions:
      // first word has to be an SQL keyword
      range.startColumn === 1
        ? suggestionsFromDefaultKeywords
        : // if last char is === '.' it means we are joining so we want to present just specific osquery table suggestions
        isDot
        ? osqueryColumns
        : uniqBy(
            [
              ...suggestionsFromDefaultKeywords,
              ...tableNameKeywords,
              ...builtinConstantsKeywords,
              ...builtinFunctionsKeywords,
              ...dataTypesKeywords,
              ...localKeywords,
            ],
            (word) => word.label.toLowerCase()
          ),
  };
};
