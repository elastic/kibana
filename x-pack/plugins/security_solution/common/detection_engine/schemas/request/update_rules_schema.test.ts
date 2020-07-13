/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  updateRulesSchema,
  UpdateRulesSchema,
  UpdateRulesSchemaDecoded,
} from './update_rules_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import {
  getUpdateRulesSchemaMock,
  getUpdateRulesSchemaDecodedMock,
} from './update_rules_schema.mock';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { getListArrayMock } from '../types/lists.mock';

describe('update rules schema', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {};

    const decoded = updateRulesSchema.decode(payload);
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

  test('made up values do not validate', () => {
    const payload: UpdateRulesSchema & { madeUp: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUp: 'hi',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<UpdateRulesSchema> = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can send in an empty array to threat', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      threat: [],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      threat: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: UpdateRulesSchema = {
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
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
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('allows references to be sent as valid', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      references: ['index-1'],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      references: ['index-1'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults references to an array if it is not sent in', () => {
    const { references, ...noReferences } = getUpdateRulesSchemaMock();
    const decoded = updateRulesSchema.decode(noReferences);
    const checked = exactCheck(noReferences, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      references: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<UpdateRulesSchema, 'references'> & { references: number[] } = {
      ...getUpdateRulesSchemaMock(),
      references: [5],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<UpdateRulesSchema, 'index'> & { index: number[] } = {
      ...getUpdateRulesSchemaMock(),
      index: [5],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test('defaults interval to 5 min', () => {
    const { interval, ...noInterval } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noInterval,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { interval: expectedInterval, ...expectedNoInterval } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoInterval,
      interval: '5m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults max signals to 100', () => {
    const { max_signals, ...noMaxSignals } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noMaxSignals,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      max_signals: expectedMaxSignals,
      ...expectedNoMaxSignals
    } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoMaxSignals,
      max_signals: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('saved_query type can have filters with it', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      filters: [],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('filters cannot be a string', () => {
    const payload: Omit<UpdateRulesSchema, 'filters'> & { filters: string } = {
      ...getUpdateRulesSchemaMock(),
      filters: 'some string',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('language validates with kuery', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      language: 'kuery',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      language: 'kuery',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language validates with lucene', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      language: 'lucene',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      language: 'lucene',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<UpdateRulesSchema, 'language'> & { language: string } = {
      ...getUpdateRulesSchemaMock(),
      language: 'something-made-up',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be negative', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      max_signals: -1,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be zero', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      max_signals: 0,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test('max_signals can be 1', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      max_signals: 1,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      max_signals: 1,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      tags: ['tag_1', 'tag_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload: Omit<UpdateRulesSchema, 'tags'> & { tags: number[] } = {
      ...getUpdateRulesSchemaMock(),
      tags: [0, 1, 2],
    };

    const decoded = updateRulesSchema.decode(payload);
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
    const payload: Omit<UpdateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<UpdateRulesSchema['threat'], 'framework'>>>;
    } = {
      ...getUpdateRulesSchemaMock(),
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,framework"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload: Omit<UpdateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<UpdateRulesSchema['threat'], 'tactic'>>>;
    } = {
      ...getUpdateRulesSchemaMock(),
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,tactic"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "technique"', () => {
    const payload: Omit<UpdateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<UpdateRulesSchema['threat'], 'technique'>>>;
    } = {
      ...getUpdateRulesSchemaMock(),
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

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,technique"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      false_positives: ['false_1', 'false_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload: Omit<UpdateRulesSchema, 'false_positives'> & { false_positives: number[] } = {
      ...getUpdateRulesSchemaMock(),
      false_positives: [5, 4],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "false_positives"',
      'Invalid value "4" supplied to "false_positives"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to a number when trying to update a rule', () => {
    const payload: Omit<UpdateRulesSchema, 'immutable'> & { immutable: number } = {
      ...getUpdateRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      risk_score: 101,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "101" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      risk_score: -1,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "risk_score"']);
    expect(message.schema).toEqual({});
  });

  test('You can set the risk_score to 0', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      risk_score: 0,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      risk_score: 0,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set the risk_score to 100', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      risk_score: 100,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      risk_score: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set meta to any object you want', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot update meta as a string', () => {
    const payload: Omit<UpdateRulesSchema, 'meta'> & { meta: string } = {
      ...getUpdateRulesSchemaMock(),
      meta: 'should not work',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can omit the query string when filters are present', () => {
    const { query, ...noQuery } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noQuery,
      filters: [],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { query: expectedQuery, ...expectedNoQuery } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoQuery,
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: UpdateRulesSchema = {
      ...getUpdateRulesSchemaMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: UpdateRulesSchemaDecoded = {
      ...getUpdateRulesSchemaDecodedMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...noFrom } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noFrom,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { from: expectedFrom, ...expectedNoFrom } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoFrom,
      from: 'now-6m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...noTo } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noTo,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { to: expectedTo, ...expectedNoTo } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoTo,
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<UpdateRulesSchema, 'severity'> & { severity: string } = {
      ...getUpdateRulesSchemaMock(),
      severity: 'junk',
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "junk" supplied to "severity"']);
    expect(message.schema).toEqual({});
  });

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...noActions } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noActions,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { actions: expectedActions, ...expectedNoActions } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoActions,
      actions: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<UpdateRulesSchema['actions'], 'group'> = {
      ...getUpdateRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,group"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<UpdateRulesSchema['actions'], 'id'> = {
      ...getUpdateRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload: Omit<UpdateRulesSchema['actions'], 'action_type_id'> = {
      ...getUpdateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', params: {} }],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<UpdateRulesSchema['actions'], 'params'> = {
      ...getUpdateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,params"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<UpdateRulesSchema['actions'], 'actions'> = {
      ...getUpdateRulesSchemaMock(),
      actions: [
        {
          group: 'group',
          id: 'id',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...noThrottle } = getUpdateRulesSchemaMock();
    const payload: UpdateRulesSchema = {
      ...noThrottle,
    };

    const decoded = updateRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { throttle: expectedThrottle, ...expectedNoThrottle } = getUpdateRulesSchemaDecodedMock();
    const expected: UpdateRulesSchemaDecoded = {
      ...expectedNoThrottle,
      throttle: null,
    };
    expect(message.schema).toEqual(expected);
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: UpdateRulesSchema = {
        ...getUpdateRulesSchemaMock(),
        note: '# documentation markdown here',
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
        ...getUpdateRulesSchemaDecodedMock(),
        note: '# documentation markdown here',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You can set note to an empty string', () => {
      const payload: UpdateRulesSchema = {
        ...getUpdateRulesSchemaMock(),
        note: '',
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
        ...getUpdateRulesSchemaDecodedMock(),
        note: '',
      };
      expect(message.schema).toEqual(expected);
    });

    // Note: If you're looking to remove `note`, omit `note` entirely
    test('You cannot set note to null', () => {
      const payload: Omit<UpdateRulesSchema, 'note'> & { note: null } = {
        ...getUpdateRulesSchemaMock(),
        note: null,
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['Invalid value "null" supplied to "note"']);
      expect(message.schema).toEqual({});
    });

    test('You cannot set note as an object', () => {
      const payload: Omit<UpdateRulesSchema, 'note'> & { note: {} } = {
        ...getUpdateRulesSchemaMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"somethingHere":"something else"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: UpdateRulesSchema = {
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

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
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
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: UpdateRulesSchema = {
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
        filters: [],
        note: '# some markdown',
        exceptions_list: getListArrayMock(),
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
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
        filters: [],
        exceptions_list: [
          {
            id: 'some_uuid',
            namespace_type: 'single',
            type: 'detection',
          },
          {
            id: 'some_uuid',
            namespace_type: 'agnostic',
            type: 'endpoint',
          },
        ],
      };
      expect(message.schema).toEqual(expected);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: UpdateRulesSchema = {
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
        filters: [],
        note: '# some markdown',
        exceptions_list: [],
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
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
        filters: [],
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload: Omit<UpdateRulesSchema, 'exceptions_list'> & {
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
        risk_score: 50,
        filters: [],
        note: '# some markdown',
        exceptions_list: [{ id: 'uuid_here', namespace_type: 'not a namespace type' }],
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "exceptions_list,type"',
        'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: UpdateRulesSchema = {
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
        filters: [],
        note: '# some markdown',
      };

      const decoded = updateRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: UpdateRulesSchemaDecoded = {
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
        exceptions_list: [],
        filters: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });
});
