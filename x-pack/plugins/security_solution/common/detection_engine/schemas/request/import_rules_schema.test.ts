/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';
import {
  ImportRulesSchema,
  importRulesSchema,
  ImportRulesSchemaDecoded,
  importRulesQuerySchema,
  ImportRulesQuerySchema,
  importRulesPayloadSchema,
  ImportRulesPayloadSchema,
} from './import_rules_schema';
import {
  getImportRulesSchemaMock,
  getImportRulesSchemaDecodedMock,
} from './import_rules_schema.mock';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { getListArrayMock } from '../types/lists.mock';

describe('import rules schema', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<ImportRulesSchema> = {};

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
      'Invalid value "undefined" supplied to "rule_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('made up values do not validate', () => {
    const payload: ImportRulesSchema & { madeUp: string } = {
      ...getImportRulesSchemaMock(),
      madeUp: 'hi',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
      interval: '5m',
      index: ['index-1'],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
      query: 'some query',
      index: ['index-1'],
      interval: '5m',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
      query: 'some query',
      index: ['index-1'],
      interval: '5m',
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      threat: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
      immutable: false,
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<ImportRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      threat: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
      immutable: false,
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      threat: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
      immutable: false,
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      risk_score: 50,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      risk_score: 50,
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      threat: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
      immutable: false,
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      threat: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
      immutable: false,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can send in an empty array to threat', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      threat: [],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      threat: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: ImportRulesSchema = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      threat: [
        {
          framework: 'someFramework',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      immutable: false,
      threat: [
        {
          framework: 'someFramework',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
      references: [],
      actions: [],
      enabled: true,
      false_positives: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      tags: [],
      throttle: null,
      version: 1,
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('allows references to be sent as valid', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      references: ['index-1'],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      references: ['index-1'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults references to an array if it is not sent in', () => {
    const { references, ...noReferences } = getImportRulesSchemaMock();
    const decoded = importRulesSchema.decode(noReferences);
    const checked = exactCheck(noReferences, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      references: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<ImportRulesSchema, 'references'> & { references: number[] } = {
      ...getImportRulesSchemaMock(),
      references: [5],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<ImportRulesSchema, 'index'> & { index: number[] } = {
      ...getImportRulesSchemaMock(),
      index: [5],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test('defaults interval to 5 min', () => {
    const { interval, ...noInterval } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noInterval,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { interval: expectedInterval, ...expectedNoInterval } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoInterval,
      interval: '5m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults max signals to 100', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { max_signals, ...noMaxSignals } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noMaxSignals,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      max_signals: expectedMaxSignals,
      ...expectedNoMaxSignals
    } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoMaxSignals,
      max_signals: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('saved_query type can have filters with it', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      filters: [],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('filters cannot be a string', () => {
    const payload: Omit<ImportRulesSchema, 'filters'> & { filters: string } = {
      ...getImportRulesSchemaMock(),
      filters: 'some string',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('language validates with kuery', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      language: 'kuery',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      language: 'kuery',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language validates with lucene', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      language: 'lucene',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      language: 'lucene',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<ImportRulesSchema, 'language'> & { language: string } = {
      ...getImportRulesSchemaMock(),
      language: 'something-made-up',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be negative', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      max_signals: -1,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be zero', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      max_signals: 0,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test('max_signals can be 1', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      max_signals: 1,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      max_signals: 1,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      tags: ['tag_1', 'tag_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload: Omit<ImportRulesSchema, 'tags'> & { tags: number[] } = {
      ...getImportRulesSchemaMock(),
      tags: [0, 1, 2],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "tags"',
      'Invalid value "1" supplied to "tags"',
      'Invalid value "2" supplied to "tags"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    const payload: Omit<ImportRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<ImportRulesSchema['threat'], 'framework'>>>;
    } = {
      ...getImportRulesSchemaMock(),
      threat: [
        {
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,framework"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload: Omit<ImportRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<ImportRulesSchema['threat'], 'tactic'>>>;
    } = {
      ...getImportRulesSchemaMock(),
      threat: [
        {
          framework: 'fake',
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,tactic"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "technique"', () => {
    const payload: Omit<ImportRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<ImportRulesSchema['threat'], 'technique'>>>;
    } = {
      ...getImportRulesSchemaMock(),
      threat: [
        {
          framework: 'fake',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
        },
      ],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,technique"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      false_positives: ['false_1', 'false_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload: Omit<ImportRulesSchema, 'false_positives'> & { false_positives: number[] } = {
      ...getImportRulesSchemaMock(),
      false_positives: [5, 4],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "false_positives"',
      'Invalid value "4" supplied to "false_positives"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to a number when trying to create a rule', () => {
    const payload: Omit<ImportRulesSchema, 'immutable'> & { immutable: number } = {
      ...getImportRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You can optionally set the immutable to be false', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      immutable: false,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getImportRulesSchemaDecodedMock());
  });

  test('You cannot set the immutable to be true', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      immutable: true,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "true" supplied to "immutable"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to be a number', () => {
    const payload: Omit<ImportRulesSchema, 'immutable'> & { immutable: number } = {
      ...getImportRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      risk_score: 101,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "101" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      risk_score: -1,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "risk_score"']);
    expect(message.schema).toEqual({});
  });

  test('You can set the risk_score to 0', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      risk_score: 0,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      risk_score: 0,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set the risk_score to 100', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      risk_score: 100,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      risk_score: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set meta to any object you want', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot create meta as a string', () => {
    const payload: Omit<ImportRulesSchema, 'meta'> & { meta: string } = {
      ...getImportRulesSchemaMock(),
      meta: 'should not work',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can omit the query string when filters are present', () => {
    const { query, ...noQuery } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noQuery,
      filters: [],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { query: expectedQuery, ...expectedNoQuery } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoQuery,
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };
    expect(message.schema).toEqual(expected);
  });

  test('rule_id is required and you cannot get by with just id', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
    };
    delete payload.rule_id;

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rule_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it validates with created_at, updated_at, created_by, updated_by values', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      created_at: '2020-01-09T06:15:24.749Z',
      updated_at: '2020-01-09T06:15:24.749Z',
      created_by: 'Braden Hassanabad',
      updated_by: 'Evan Hassanabad',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: ImportRulesSchemaDecoded = {
      ...getImportRulesSchemaDecodedMock(),
      created_at: '2020-01-09T06:15:24.749Z',
      updated_at: '2020-01-09T06:15:24.749Z',
      created_by: 'Braden Hassanabad',
      updated_by: 'Evan Hassanabad',
    };
    expect(message.schema).toEqual(expected);
  });

  test('it does not validate with epoch strings for created_at', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      created_at: '1578550728650',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1578550728650" supplied to "created_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it does not validate with epoch strings for updated_at', () => {
    const payload: ImportRulesSchema = {
      ...getImportRulesSchemaMock(),
      updated_at: '1578550728650',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1578550728650" supplied to "updated_at"',
    ]);
    expect(message.schema).toEqual({});
  });

  describe('importRulesQuerySchema', () => {
    test('overwrite gets a default value of false', () => {
      const payload: ImportRulesQuerySchema = {};

      const decoded = importRulesQuerySchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual({
        overwrite: false,
      });
    });

    test('overwrite validates with a boolean true', () => {
      const payload: ImportRulesQuerySchema = { overwrite: true };

      const decoded = importRulesQuerySchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual({
        overwrite: true,
      });
    });

    test('overwrite does not validate with a weird string', () => {
      const payload: Omit<ImportRulesQuerySchema, 'overwrite'> & { overwrite: string } = {
        overwrite: 'invalid-string',
      };

      const decoded = importRulesQuerySchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid-string" supplied to "overwrite"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('importRulesPayloadSchema', () => {
    test('does not validate with an empty object', () => {
      const payload = {};

      const decoded = importRulesPayloadSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "file"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('does not validate with a made string', () => {
      const payload: Omit<ImportRulesPayloadSchema, 'file'> & { madeUpKey: string } = {
        madeUpKey: 'madeupstring',
      };

      const decoded = importRulesPayloadSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "file"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('does validate with a file object', () => {
      const payload: ImportRulesPayloadSchema = { file: {} };

      const decoded = importRulesPayloadSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...noFrom } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noFrom,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { from: expectedFrom, ...expectedNoFrom } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoFrom,
      from: 'now-6m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...noTo } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noTo,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { to: expectedTo, ...expectedNoTo } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoTo,
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<ImportRulesSchema, 'severity'> & { severity: string } = {
      ...getImportRulesSchemaMock(),
      severity: 'junk',
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "junk" supplied to "severity"']);
    expect(message.schema).toEqual({});
  });

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...noActions } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noActions,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { actions: expectedActions, ...expectedNoActions } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoActions,
      actions: [],
    };
    expect(message.schema).toEqual(expected);
  });
  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<ImportRulesSchema['actions'], 'group'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,group"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<ImportRulesSchema['actions'], 'id'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload: Omit<ImportRulesSchema['actions'], 'action_type_id'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', params: {} }],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<ImportRulesSchema['actions'], 'params'> = {
      ...getImportRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,params"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<ImportRulesSchema['actions'], 'actions'> = {
      ...getImportRulesSchemaMock(),
      actions: [
        {
          group: 'group',
          id: 'id',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...noThrottle } = getImportRulesSchemaMock();
    const payload: ImportRulesSchema = {
      ...noThrottle,
    };

    const decoded = importRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { throttle: expectedThrottle, ...expectedNoThrottle } = getImportRulesSchemaDecodedMock();
    const expected: ImportRulesSchemaDecoded = {
      ...expectedNoThrottle,
      throttle: null,
    };
    expect(message.schema).toEqual(expected);
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: ImportRulesSchema = {
        ...getImportRulesSchemaMock(),
        note: '# documentation markdown here',
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        ...getImportRulesSchemaDecodedMock(),
        note: '# documentation markdown here',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You can set note to an empty string', () => {
      const payload: ImportRulesSchema = {
        ...getImportRulesSchemaMock(),
        note: '',
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        ...getImportRulesSchemaDecodedMock(),
        note: '',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You cannot create note as an object', () => {
      const payload: Omit<ImportRulesSchema, 'note'> & { note: {} } = {
        ...getImportRulesSchemaMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"somethingHere":"something else"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: ImportRulesSchema = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
        references: [],
        actions: [],
        enabled: true,
        false_positives: [],
        immutable: false,
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: ImportRulesSchema = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: getListArrayMock(),
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
        references: [],
        actions: [],
        enabled: true,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        filters: [],
        immutable: false,
        exceptions_list: [
          {
            id: 'some_uuid',
            list_id: 'list_id_single',
            namespace_type: 'single',
            type: 'detection',
          },
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            namespace_type: 'agnostic',
            type: 'endpoint',
          },
        ],
      };
      expect(message.schema).toEqual(expected);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: ImportRulesSchema = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: [],
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
        references: [],
        actions: [],
        enabled: true,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        immutable: false,
        filters: [],
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload: Omit<ImportRulesSchema, 'exceptions_list'> & {
        exceptions_list: Array<{ id: string; namespace_type: string }>;
      } = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: [{ id: 'uuid_here', namespace_type: 'not a namespace type' }],
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "exceptions_list,list_id"',
        'Invalid value "undefined" supplied to "exceptions_list,type"',
        'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: ImportRulesSchema = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
      };

      const decoded = importRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ImportRulesSchemaDecoded = {
        author: [],
        severity_mapping: [],
        risk_score_mapping: [],
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
        references: [],
        actions: [],
        enabled: true,
        false_positives: [],
        max_signals: DEFAULT_MAX_SIGNALS,
        tags: [],
        threat: [],
        throttle: null,
        version: 1,
        immutable: false,
        exceptions_list: [],
        filters: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });
});
