/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRulesSchema, CreateRulesSchema, SavedQueryCreateSchema } from './rule_schemas';
import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';
import {
  getCreateSavedQueryRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
  getCreateRulesSchemaMock,
  getCreateThresholdRulesSchemaMock,
} from './rule_schemas.mock';
import { getListArrayMock } from '../types/lists.mock';

describe('create rules schema', () => {
  test('empty objects do not validate', () => {
    const payload = {};

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.errors.length).toBeGreaterThan(0);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    const payload: SavedQueryCreateSchema = {
      ...getCreateSavedQueryRulesSchemaMock(),
      filters: [],
    };

    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('filters cannot be a string', () => {
    const payload = {
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
  });

  test('language does not validate with something made up', () => {
    const payload = {
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload = {
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
    const payload = {
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
    const payload = {
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
    const payload = {
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
    expect(message.schema).toEqual(payload);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload = {
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
    const payload = {
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
  });

  test('You cannot create meta as a string', () => {
    const payload = {
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
    expect(message.schema).toEqual(payload);
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
    expect(message.schema).toEqual(payload);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload = {
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
    const payload = {
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
    const payload = {
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
    const payload = {
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
    const payload = {
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
    const payload = {
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
      expect(message.schema).toEqual(payload);
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
      expect(message.schema).toEqual(payload);
    });

    test('You cannot create note as an object', () => {
      const payload = {
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

    test('empty name is not valid', () => {
      const payload: CreateRulesSchema = {
        ...getCreateRulesSchemaMock(),
        name: '',
      };

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "name"']);
      expect(message.schema).toEqual({});
    });

    test('empty description is not valid', () => {
      const payload: CreateRulesSchema = {
        ...getCreateRulesSchemaMock(),
        description: '',
      };

      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "" supplied to "description"',
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
      expect(message.schema).toEqual(payload);
    });
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
    expect(message.schema).toEqual(payload);
  });

  test('saved_id is required when type is saved_query and will not validate without it', () => {
    /* eslint-disable @typescript-eslint/naming-convention */
    const { saved_id, ...payload } = getCreateSavedQueryRulesSchemaMock();
    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "saved_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('threshold is required when type is threshold and will not validate without it', () => {
    const { threshold, ...payload } = getCreateThresholdRulesSchemaMock();
    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threshold"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('threshold rules fail validation if threshold is not greater than 0', () => {
    const payload = getCreateThresholdRulesSchemaMock();
    payload.threshold.value = 0;
    const decoded = createRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "threshold,value"',
    ]);
    expect(message.schema).toEqual({});
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
      expect(message.schema).toEqual(payload);
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
      expect(message.schema).toEqual(payload);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload = {
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
        'Invalid value "undefined" supplied to "exceptions_list,list_id"',
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
      expect(message.schema).toEqual(payload);
    });
  });

  describe('threat_mapping', () => {
    test('You can set a threat query, index, mapping, filters when creating a rule', () => {
      const payload = getCreateThreatMatchRulesSchemaMock();
      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('threat_index, threat_query, and threat_mapping are required when type is "threat_match" and validation fails without them', () => {
      /* eslint-disable @typescript-eslint/naming-convention */
      const {
        threat_index,
        threat_query,
        threat_mapping,
        ...payload
      } = getCreateThreatMatchRulesSchemaMock();
      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "threat_query"',
        'Invalid value "undefined" supplied to "threat_mapping"',
        'Invalid value "undefined" supplied to "threat_index"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('fails validation when threat_mapping is an empty array', () => {
      const payload = getCreateThreatMatchRulesSchemaMock();
      payload.threat_mapping = [];
      const decoded = createRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "[]" supplied to "threat_mapping"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
