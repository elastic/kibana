/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { getListArrayMock } from '../../../../detection_engine/schemas/types/lists.mock';
import {
  getCreateEsqlRulesSchemaMock,
  getCreateMachineLearningRulesSchemaMock,
  getCreateRulesSchemaMock,
  getCreateRulesSchemaMockWithDataView,
  getCreateSavedQueryRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
  getCreateThresholdRulesSchemaMock,
} from './rule_request_schema.mock';
import type { SavedQueryRuleCreateProps } from './rule_schemas.gen';
import { RuleCreateProps } from './rule_schemas.gen';

describe('rules schema', () => {
  test('empty objects do not validate', () => {
    const payload = {};

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('strips any unknown values', () => {
    const payload: RuleCreateProps & { madeUp: string } = {
      ...getCreateRulesSchemaMock(),
      madeUp: 'hi',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(getCreateRulesSchemaMock());
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description, from] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description, from, to] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description, from, to, name, severity] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"
    );
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('risk_score: Required');
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('risk_score: Required');
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('risk_score: Required');
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<RuleCreateProps> = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('risk_score: Required');
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can send in a namespace', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      namespace: 'a namespace',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can send in an empty array to threat', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      threat: [],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('allows references to be sent as valid', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      references: ['index-1'],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<RuleCreateProps, 'references'> & { references: number[] } = {
      ...getCreateRulesSchemaMock(),
      references: [5],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'references.0: Expected string, received number'
    );
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<RuleCreateProps, 'index'> & { index: number[] } = {
      ...getCreateRulesSchemaMock(),
      index: [5],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('index.0: Expected string, received number');
  });

  test('saved_query type can have filters with it', () => {
    const payload: SavedQueryRuleCreateProps = {
      ...getCreateSavedQueryRulesSchemaMock(),
      filters: [],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('filters cannot be a string', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      filters: 'some string',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('filters: Expected array, received string');
  });

  test('language validates with kuery', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      language: 'kuery',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language validates with lucene', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      language: 'lucene',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language does not validate with something made up', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      language: 'something-made-up',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "language: Invalid enum value. Expected 'kuery' | 'lucene', received 'something-made-up'"
    );
  });

  test('max_signals cannot be negative', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      max_signals: -1,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'max_signals: Number must be greater than or equal to 1'
    );
  });

  test('max_signals cannot be zero', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      max_signals: 0,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'max_signals: Number must be greater than or equal to 1'
    );
  });

  test('max_signals can be 1', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      max_signals: 1,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      tags: ['tag_1', 'tag_2'],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      tags: [0, 1, 2],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'tags.0: Expected string, received number, tags.1: Expected string, received number, tags.2: Expected string, received number'
    );
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('threat.0.framework: Required');
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('threat.0.tactic: Required');
  });

  test('You can send in an array of threat that are missing "technique"', () => {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      false_positives: ['false_1', 'false_2'],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      false_positives: [5, 4],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'false_positives.0: Expected string, received number, false_positives.1: Expected string, received number'
    );
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      risk_score: 101,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'risk_score: Number must be less than or equal to 100'
    );
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      risk_score: -1,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'risk_score: Number must be greater than or equal to 0'
    );
  });

  test('You can set the risk_score to 0', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      risk_score: 0,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set the risk_score to 100', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      risk_score: 100,
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set meta to any object you want', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot create meta as a string', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      meta: 'should not work',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('meta: Expected object, received string');
  });

  test('You can omit the query string when filters are present', () => {
    const { query, ...noQuery } = getCreateRulesSchemaMock();
    const payload: RuleCreateProps = {
      ...noQuery,
      filters: [],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: RuleCreateProps = {
      ...getCreateRulesSchemaMock(),
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      severity: 'junk',
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk'"
    );
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('actions.0.group: Required');
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('actions.0.id: Required');
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', params: {} }],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('actions.0.action_type_id: Required');
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload = {
      ...getCreateRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('actions.0.params: Required');
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('actions.0.action_type_id: Required');
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: RuleCreateProps = {
        ...getCreateRulesSchemaMock(),
        note: '# documentation markdown here',
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You can set note to an empty string', () => {
      const payload: RuleCreateProps = {
        ...getCreateRulesSchemaMock(),
        note: '',
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You cannot create note as an object', () => {
      const payload = {
        ...getCreateRulesSchemaMock(),
        note: {
          somethingHere: 'something else',
        },
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('note: Expected string, received object');
    });

    test('empty name is not valid', () => {
      const payload: RuleCreateProps = {
        ...getCreateRulesSchemaMock(),
        name: '',
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'name: String must contain at least 1 character(s)'
      );
    });

    test('empty description is not valid', () => {
      const payload: RuleCreateProps = {
        ...getCreateRulesSchemaMock(),
        description: '',
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'description: String must contain at least 1 character(s)'
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: RuleCreateProps = {
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

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  test('machine_learning type does validate', () => {
    const payload: RuleCreateProps = {
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

    const result = RuleCreateProps.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('saved_id is required when type is saved_query and will not validate without it', () => {
    /* eslint-disable @typescript-eslint/naming-convention */
    const { saved_id, ...payload } = getCreateSavedQueryRulesSchemaMock();

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('saved_id: Required');
  });

  test('threshold is required when type is threshold and will not validate without it', () => {
    const { threshold, ...payload } = getCreateThresholdRulesSchemaMock();

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('threshold: Required');
  });

  test('threshold rules fail validation if threshold is not greater than 0', () => {
    const payload = getCreateThresholdRulesSchemaMock();
    payload.threshold.value = 0;

    const result = RuleCreateProps.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'threshold.value: Number must be greater than or equal to 1'
    );
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: RuleCreateProps = {
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

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: RuleCreateProps = {
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

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
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

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        "exceptions_list.0.list_id: Required, exceptions_list.0.type: Required, exceptions_list.0.namespace_type: Invalid enum value. Expected 'agnostic' | 'single', received 'not a namespace type'"
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: RuleCreateProps = {
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

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('threat_match', () => {
    test('You can set a threat query, index, mapping, filters when creating a rule', () => {
      const payload = getCreateThreatMatchRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('threat_index, threat_query, and threat_mapping are required when type is "threat_match" and validation fails without them', () => {
      /* eslint-disable @typescript-eslint/naming-convention */
      const { threat_index, threat_query, threat_mapping, ...payload } =
        getCreateThreatMatchRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'threat_query: Required, threat_mapping: Required, threat_index: Required'
      );
    });

    test('fails validation when threat_mapping is an empty array', () => {
      const payload = getCreateThreatMatchRulesSchemaMock();
      payload.threat_mapping = [];

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'threat_mapping: Array must contain at least 1 element(s)'
      );
    });
  });

  describe('esql rule type', () => {
    it('should validate correct payload', () => {
      const payload = getCreateEsqlRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    it('should drop the "index" property', () => {
      const payload = { ...getCreateEsqlRulesSchemaMock(), index: ['test*'] };
      const expected = getCreateEsqlRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    it('should drop the "data_view_id" property', () => {
      const payload = { ...getCreateEsqlRulesSchemaMock(), data_view_id: 'test' };
      const expected = getCreateEsqlRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    it('should drop the "filters" property', () => {
      const payload = { ...getCreateEsqlRulesSchemaMock(), filters: [] };
      const expected = getCreateEsqlRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });
  });

  describe('data_view_id', () => {
    test('validates when "data_view_id" and index are defined', () => {
      const payload = { ...getCreateRulesSchemaMockWithDataView(), index: ['auditbeat-*'] };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('"data_view_id" cannot be a number', () => {
      const payload: Omit<RuleCreateProps, 'data_view_id'> & { data_view_id: number } = {
        ...getCreateRulesSchemaMockWithDataView(),
        data_view_id: 5,
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'data_view_id: Expected string, received number'
      );
    });

    test('it should validate a type of "query" with "data_view_id" defined', () => {
      const payload = getCreateRulesSchemaMockWithDataView();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "saved_query" with "data_view_id" defined', () => {
      const payload = { ...getCreateSavedQueryRulesSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "threat_match" with "data_view_id" defined', () => {
      const payload = { ...getCreateThreatMatchRulesSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a type of "threshold" with "data_view_id" defined', () => {
      const payload = { ...getCreateThresholdRulesSchemaMock(), data_view_id: 'logs-*' };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should drop "data_view_id" when passed to "machine_learning" rules', () => {
      const payload = { ...getCreateMachineLearningRulesSchemaMock(), data_view_id: 'logs-*' };
      const expected = getCreateMachineLearningRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('You can omit investigation_fields', () => {
      // getCreateRulesSchemaMock doesn't include investigation_fields
      const payload: RuleCreateProps = getCreateRulesSchemaMock();

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You cannot pass empty object for investigation_fields', () => {
      const payload: Omit<RuleCreateProps, 'investigation_fields'> & {
        investigation_fields: unknown;
      } = {
        ...getCreateRulesSchemaMock(),
        investigation_fields: {},
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('investigation_fields.field_names: Required');
    });

    test('You can send in investigation_fields', () => {
      const payload: RuleCreateProps = {
        ...getCreateRulesSchemaMock(),
        investigation_fields: { field_names: ['field1', 'field2'] },
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You cannot send in an empty array of investigation_fields.field_names', () => {
      const payload = {
        ...getCreateRulesSchemaMock(),
        investigation_fields: { field_names: [] },
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'investigation_fields.field_names: Array must contain at least 1 element(s)'
      );
    });

    test('You cannot send in an array of investigation_fields.field_names that are numbers', () => {
      const payload = {
        ...getCreateRulesSchemaMock(),
        investigation_fields: { field_names: [0, 1, 2] },
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'investigation_fields.field_names.0: Expected string, received number, investigation_fields.field_names.1: Expected string, received number, investigation_fields.field_names.2: Expected string, received number'
      );
    });

    test('You cannot send in investigation_fields without specifying fields', () => {
      const payload = {
        ...getCreateRulesSchemaMock(),
        investigation_fields: { foo: true },
      };

      const result = RuleCreateProps.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('investigation_fields.field_names: Required');
    });
  });

  describe('alerts suppression', () => {
    describe(`alert suppression validation for "threshold" rule type`, () => {
      test('should drop suppression fields apart from duration for "threshold" rule type', () => {
        const payload = {
          ...getCreateThresholdRulesSchemaMock(),
          alert_suppression: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_field_strategy: 'suppress',
          },
        };

        const result = RuleCreateProps.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual({
          ...payload,
          alert_suppression: {
            duration: { value: 5, unit: 'm' },
          },
        });
      });
      test('should validate only suppression duration for "threshold" rule type', () => {
        const payload = {
          ...getCreateThresholdRulesSchemaMock(),
          alert_suppression: {
            duration: { value: 5, unit: 'm' },
          },
        };

        const result = RuleCreateProps.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
      test('should throw error if alert suppression duration is absent for "threshold" rule type', () => {
        const payload = {
          ...getCreateThresholdRulesSchemaMock(),
          alert_suppression: {
            group_by: ['host.name'],
            missing_field_strategy: 'suppress',
          },
        };

        const result = RuleCreateProps.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"alert_suppression.duration: Required"`
        );
      });
    });
    // behaviour common for multiple rule types
    const cases = [
      { ruleType: 'threat_match', ruleMock: getCreateThreatMatchRulesSchemaMock() },
      { ruleType: 'query', ruleMock: getCreateRulesSchemaMock() },
      { ruleType: 'saved_query', ruleMock: getCreateSavedQueryRulesSchemaMock() },
    ];

    cases.forEach(({ ruleType, ruleMock }) => {
      describe(`alert suppression validation for "${ruleType}" rule type`, () => {
        test(`should validate suppression fields for "${ruleType}" rule type`, () => {
          const payload = {
            ...ruleMock,
            alert_suppression: {
              group_by: ['agent.name'],
              duration: { value: 5, unit: 'm' },
              missing_fields_strategy: 'suppress',
            },
          };

          const result = RuleCreateProps.safeParse(payload);
          expectParseSuccess(result);
          expect(result.data).toEqual(payload);
        });

        test(`should throw error if suppression fields not valid for "${ruleType}" rule`, () => {
          const payload = {
            ...ruleMock,
            alert_suppression: {
              group_by: 'not an array',
              missing_fields_strategy: 'suppress',
            },
          };

          const result = RuleCreateProps.safeParse(payload);
          expectParseError(result);
          expect(stringifyZodError(result.error)).toEqual(
            'alert_suppression.group_by: Expected array, received string'
          );
        });

        test(`should throw error if suppression required field is missing for "${ruleType}" rule`, () => {
          const payload = {
            ...ruleMock,
            alert_suppression: {
              duration: { value: 5, unit: 'm' },
              missing_fields_strategy: 'suppress',
            },
          };

          const result = RuleCreateProps.safeParse(payload);
          expectParseError(result);
          expect(stringifyZodError(result.error)).toEqual('alert_suppression.group_by: Required');
        });

        test(`should drop fields that are not in suppression schema for "${ruleType}" rule`, () => {
          const payload = {
            ...ruleMock,
            alert_suppression: {
              group_by: ['agent.name'],
              duration: { value: 5, unit: 'm' },
              missing_fields_strategy: 'suppress',
              random_field: 1,
            },
          };

          const result = RuleCreateProps.safeParse(payload);
          expectParseSuccess(result);
          expect(result.data).toEqual({
            ...ruleMock,
            alert_suppression: {
              group_by: ['agent.name'],
              duration: { value: 5, unit: 'm' },
              missing_fields_strategy: 'suppress',
            },
          });
        });
      });
    });
  });
});
