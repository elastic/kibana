/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createRulesSchema,
  CreateRulesSchema,
  CreateRulesSchemaDecoded,
} from './create_rules_schema';
import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';
import {
  getCreateRulesSchemaMock,
  getCreateRulesSchemaDecodedMock,
} from './create_rules_schema.mock';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { getListArrayMock } from '../types/lists.mock';

describe('create rules schema', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<CreateRulesSchema> = {};

    const decoded = createRulesSchema.decode(payload);
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
    const payload: CreateRulesSchema & { madeUp: string } = {
      ...getCreateRulesSchemaMock(),
      madeUp: 'hi',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<CreateRulesSchema> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<CreateRulesSchema> = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: CreateRulesSchema = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<CreateRulesSchema> = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: CreateRulesSchema = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: CreateRulesSchema = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: CreateRulesSchema = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: CreateRulesSchema = {
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
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can send in an empty array to threat', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      threat: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      threat: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: CreateRulesSchema = {
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
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
      version: 1,
      exceptions_list: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('allows references to be sent as valid', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      references: ['index-1'],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      references: ['index-1'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults references to an array if it is not sent in', () => {
    const { references, ...noReferences } = getCreateRulesSchemaMock();
    const decoded = createRulesSchema.decode(noReferences);
    const checked = exactCheck(noReferences, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      references: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<CreateRulesSchema, 'references'> & { references: number[] } = {
      ...getCreateRulesSchemaMock(),
      references: [5],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<CreateRulesSchema, 'index'> & { index: number[] } = {
      ...getCreateRulesSchemaMock(),
      index: [5],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test('saved_query type can have filters with it', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      filters: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('filters cannot be a string', () => {
    const payload: Omit<CreateRulesSchema, 'filters'> & { filters: string } = {
      ...getCreateRulesSchemaMock(),
      filters: 'some string',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('language validates with kuery', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      language: 'kuery',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      language: 'kuery',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language validates with lucene', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      language: 'lucene',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      language: 'lucene',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<CreateRulesSchema, 'language'> & { language: string } = {
      ...getCreateRulesSchemaMock(),
      language: 'something-made-up',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be negative', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      max_signals: -1,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be zero', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      max_signals: 0,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test('max_signals can be 1', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      max_signals: 1,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      max_signals: 1,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      tags: ['tag_1', 'tag_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload: Omit<CreateRulesSchema, 'tags'> & { tags: number[] } = {
      ...getCreateRulesSchemaMock(),
      tags: [0, 1, 2],
    };

    const decoded = createRulesSchema.decode(payload);
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
    const payload: Omit<CreateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<CreateRulesSchema['threat'], 'framework'>>>;
    } = {
      ...getCreateRulesSchemaMock(),
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,framework"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload: Omit<CreateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<CreateRulesSchema['threat'], 'tactic'>>>;
    } = {
      ...getCreateRulesSchemaMock(),
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,tactic"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of threat that are missing "technique"', () => {
    const payload: Omit<CreateRulesSchema, 'threat'> & {
      threat: Array<Partial<Omit<CreateRulesSchema['threat'], 'technique'>>>;
    } = {
      ...getCreateRulesSchemaMock(),
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

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,technique"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      false_positives: ['false_1', 'false_2'],
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload: Omit<CreateRulesSchema, 'false_positives'> & { false_positives: number[] } = {
      ...getCreateRulesSchemaMock(),
      false_positives: [5, 4],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "false_positives"',
      'Invalid value "4" supplied to "false_positives"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the immutable to a number when trying to create a rule', () => {
    const payload: Omit<CreateRulesSchema, 'immutable'> & { immutable: number } = {
      ...getCreateRulesSchemaMock(),
      immutable: 5,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "immutable"']);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      risk_score: 101,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "101" supplied to "risk_score"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      risk_score: -1,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "risk_score"']);
    expect(message.schema).toEqual({});
  });

  test('You can set the risk_score to 0', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      risk_score: 0,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      risk_score: 0,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set the risk_score to 100', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      risk_score: 100,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      risk_score: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('You can set meta to any object you want', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot create meta as a string', () => {
    const payload: Omit<CreateRulesSchema, 'meta'> & { meta: string } = {
      ...getCreateRulesSchemaMock(),
      meta: 'should not work',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You can omit the query string when filters are present', () => {
    const { query, ...noQuery } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noQuery,
      filters: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { query: expectedQuery, ...expectedNoQuery } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoQuery,
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: CreateRulesSchema = {
      ...getCreateRulesSchemaMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      ...getCreateRulesSchemaDecodedMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<CreateRulesSchema, 'severity'> & { severity: string } = {
      ...getCreateRulesSchemaMock(),
      severity: 'junk',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "junk" supplied to "severity"']);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<CreateRulesSchema['actions'], 'group'> = {
      ...getCreateRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,group"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<CreateRulesSchema['actions'], 'id'> = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload: Omit<CreateRulesSchema['actions'], 'action_type_id'> = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', params: {} }],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<CreateRulesSchema['actions'], 'params'> = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,params"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<CreateRulesSchema['actions'], 'actions'> = {
      ...getCreateRulesSchemaMock(),
      actions: [
        {
          group: 'group',
          id: 'id',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: CreateRulesSchema = {
        ...getCreateRulesSchemaMock(),
        note: '# documentation markdown here',
      };

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
        ...getCreateRulesSchemaDecodedMock(),
        note: '# documentation markdown here',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You can set note to an empty string', () => {
      const payload: CreateRulesSchema = {
        ...getCreateRulesSchemaMock(),
        note: '',
      };

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
        ...getCreateRulesSchemaDecodedMock(),
        note: '',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You cannot create note as an object', () => {
      const payload: Omit<CreateRulesSchema, 'note'> & { note: {} } = {
        ...getCreateRulesSchemaMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"somethingHere":"something else"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: CreateRulesSchema = {
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

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
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
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });

  test('defaults interval to 5 min', () => {
    const { interval, ...noInterval } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noInterval,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { interval: expectedInterval, ...expectedNoInterval } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoInterval,
      interval: '5m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('defaults max signals to 100', () => {
    const { max_signals, ...noMaxSignals } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noMaxSignals,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const {
      max_signals: expectedMaxSignals,
      ...expectedNoMaxSignals
    } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoMaxSignals,
      max_signals: 100,
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...noFrom } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noFrom,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { from: expectedFrom, ...expectedNoFrom } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoFrom,
      from: 'now-6m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...noTo } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noTo,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { to: expectedTo, ...expectedNoTo } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoTo,
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...noActions } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noActions,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { actions: expectedActions, ...expectedNoActions } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoActions,
      actions: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...noThrottle } = getCreateRulesSchemaMock();
    const payload: CreateRulesSchema = {
      ...noThrottle,
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const { throttle: expectedThrottle, ...expectedNoThrottle } = getCreateRulesSchemaDecodedMock();
    const expected: CreateRulesSchemaDecoded = {
      ...expectedNoThrottle,
      throttle: null,
    };
    expect(message.schema).toEqual(expected);
  });

  test('machine_learning type does validate', () => {
    const payload: CreateRulesSchema = {
      type: 'machine_learning',
      anomaly_threshold: 50,
      machine_learning_job_id: 'linux_anomalous_network_activity_ecs',
      false_positives: [],
      references: [],
      risk_score: 50,
      threat: [],
      name: 'ss',
      description: 'ss',
      severity: 'low',
      tags: [],
      interval: '5m',
      from: 'now-360s',
      to: 'now',
      meta: { from: '1m' },
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      rule_id: 'rule-1',
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateRulesSchemaDecoded = {
      author: [],
      severity_mapping: [],
      risk_score_mapping: [],
      type: 'machine_learning',
      anomaly_threshold: 50,
      machine_learning_job_id: 'linux_anomalous_network_activity_ecs',
      false_positives: [],
      references: [],
      risk_score: 50,
      threat: [],
      name: 'ss',
      description: 'ss',
      severity: 'low',
      tags: [],
      interval: '5m',
      from: 'now-360s',
      to: 'now',
      meta: { from: '1m' },
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      exceptions_list: [],
      max_signals: DEFAULT_MAX_SIGNALS,
      version: 1,
      rule_id: 'rule-1',
    };
    expect(message.schema).toEqual(expected);
  });

  test('it generates a uuid v4 whenever you omit the rule_id', () => {
    const { rule_id, ...noRuleId } = getCreateRulesSchemaMock();
    const decoded = createRulesSchema.decode(noRuleId);
    const checked = exactCheck(noRuleId, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateRulesSchemaDecoded).rule_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: CreateRulesSchema = {
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

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
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
      const payload: CreateRulesSchema = {
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

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
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
        exceptions_list: [],
      };
      expect(message.schema).toEqual(expected);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload: Omit<CreateRulesSchema, 'exceptions_list'> & {
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

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "exceptions_list,type"',
        'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: CreateRulesSchema = {
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

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: CreateRulesSchemaDecoded = {
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
        exceptions_list: [],
        filters: [],
      };
      expect(message.schema).toEqual(expected);
    });
  });
});
