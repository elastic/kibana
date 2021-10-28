/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ace from 'brace';
import 'brace/ext/language_tools';
import { AceInterface } from './ace_types';
import { getOsqueryTableNames } from './osquery_tables';

const osqueryTables = getOsqueryTableNames().join('|');

const keywords = [
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
].join('|');

const builtinConstants = ['true', 'false'].join('|');

const builtinFunctions = [
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
].join('|');

const dataTypes = [
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
].join('|');

// This is gross, but the types exported by brace are lagging and incorrect: https://github.com/thlorenz/brace/issues/182
(ace as unknown as AceInterface).define(
  'ace/mode/osquery_highlight_rules',
  ['require', 'exports', 'ace/mode/sql_highlight_rules'],
  // eslint-disable-next-line prefer-arrow-callback
  function (acequire, exports) {
    'use strict';

    const SqlHighlightRules = acequire('./sql_highlight_rules').SqlHighlightRules;

    class OsqueryHighlightRules extends SqlHighlightRules {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any) {
        super(...args);
        const keywordMapper = this.createKeywordMapper(
          {
            'osquery-token': osqueryTables,
            'support.function': builtinFunctions,
            keyword: keywords,
            'constant.language': builtinConstants,
            'storage.type': dataTypes,
          },
          'identifier',
          true
        );

        this.$rules = {
          start: [
            {
              token: 'comment',
              regex: '--.*$',
            },
            {
              token: 'comment',
              start: '/\\*',
              end: '\\*/',
            },
            {
              token: 'string', // " string
              regex: '".*?"',
            },
            {
              token: 'string', // ' string
              regex: "'.*?'",
            },
            {
              token: 'constant.numeric', // float
              regex: '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b',
            },
            {
              token: keywordMapper,
              regex: '[a-zA-Z_$][a-zA-Z0-9_$]*\\b',
            },
            {
              token: 'keyword.operator',
              regex: '\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|=',
            },
            {
              token: 'paren.lparen',
              regex: '[\\(]',
            },
            {
              token: 'paren.rparen',
              regex: '[\\)]',
            },
            {
              token: 'text',
              regex: '\\s+',
            },
          ],
        };

        this.normalizeRules();
      }
    }

    exports.OsqueryHighlightRules = OsqueryHighlightRules;
  }
);
