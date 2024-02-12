/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { getListArrayMock } from '../../../../../detection_engine/schemas/types/lists.mock';
import { PatchRuleRequestBody } from './patch_rule_route.gen';
import { getPatchRulesSchemaMock } from './patch_rule_route.mock';

describe('Patch rule request schema', () => {
  test('[id] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, risk_score] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      risk_score: 10,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, name] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, name] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, name, severity] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, name, severity] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, name, severity, type] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, name, severity, type] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, name, severity, type, interval] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query] does validate', () => {
    const payload: PatchRuleRequestBody = {
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
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[id, description, from, to, index, name, severity, type, filters] does validate', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      filters: [],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('[rule_id, description, from, to, index, name, severity, type, filters] does validate', () => {
    const payload: PatchRuleRequestBody = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      filters: [],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('allows references to be sent as a valid value to patch with', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      references: ['index-1'],
      query: 'some query',
      language: 'kuery',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('does not default references to an array', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.references).toEqual(undefined);
  });

  test('does not default interval', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.interval).toEqual(undefined);
  });

  test('does not default max_signals', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.max_signals).toEqual(undefined);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<PatchRuleRequestBody, 'references'> & { references: number[] } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      references: [5],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"references.0: Expected string, received number, references.0: Expected string, received number, references.0: Expected string, received number, references.0: Expected string, received number, references.0: Expected string, received number, and 3 more"`
    );
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<PatchRuleRequestBody, 'index'> & { index: number[] } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      type: 'query',
      index: [5],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"type: Invalid literal value, expected \\"eql\\", index.0: Expected string, received number, index.0: Expected string, received number, type: Invalid literal value, expected \\"saved_query\\", index.0: Expected string, received number, and 8 more"`
    );
  });

  test('saved_id is not required when type is saved_query and will validate without it', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      type: 'saved_query',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('saved_id validates with type:saved_query', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      type: 'saved_query',
      saved_id: 'some id',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('saved_query type can have filters with it', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      saved_id: 'some id',
      filters: [],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language validates with kuery', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'kuery',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language validates with lucene', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'lucene',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('language does not validate with something made up', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'something-made-up',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", language: Invalid enum value. Expected 'kuery' | 'lucene', received 'something-made-up', type: Invalid literal value, expected \\"saved_query\\", language: Invalid enum value. Expected 'kuery' | 'lucene', received 'something-made-up', and 9 more"`
    );
  });

  test('max_signals cannot be negative', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: -1,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals cannot be zero', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: 0,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals can be 1', () => {
    const payload = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: 1,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('meta can be patched', () => {
    const payload: PatchRuleRequestBody = {
      ...getPatchRulesSchemaMock(),
      meta: { whateverYouWant: 'anything_at_all' },
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot patch meta as a string', () => {
    const payload: Omit<PatchRuleRequestBody, 'meta'> & { meta: string } = {
      ...getPatchRulesSchemaMock(),
      meta: 'should not work',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"meta: Expected object, received string, type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", meta: Expected object, received string, meta: Expected object, received string, and 12 more"`
    );
  });

  test('filters cannot be a string', () => {
    const payload: Omit<PatchRuleRequestBody, 'filters'> & { filters: string } = {
      ...getPatchRulesSchemaMock(),
      filters: 'should not work',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", filters: Expected array, received string, filters: Expected array, received string, type: Invalid literal value, expected \\"saved_query\\", and 10 more"`
    );
  });

  test('name cannot be an empty string', () => {
    const payload: PatchRuleRequestBody = {
      ...getPatchRulesSchemaMock(),
      name: '',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: String must contain at least 1 character(s)"`
    );
  });

  test('description cannot be an empty string', () => {
    const payload: PatchRuleRequestBody = {
      ...getPatchRulesSchemaMock(),
      description: '',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"description: String must contain at least 1 character(s)"`
    );
  });

  test('threat is not defaulted to empty array on patch', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.threat).toEqual(undefined);
  });

  test('threat is not defaulted to undefined on patch with empty array', () => {
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat: [],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.threat).toEqual([]);
  });

  test('threat is valid when updated with all sub-objects', () => {
    const threat: PatchRuleRequestBody['threat'] = [
      {
        framework: 'fake',
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
    ];
    const payload: PatchRuleRequestBody = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('threat is invalid when updated with missing property framework', () => {
    const threat: Omit<PatchRuleRequestBody['threat'], 'framework'> = [
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
    ];
    const payload: Omit<PatchRuleRequestBody['threat'], 'framework'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"threat.0.framework: Required, threat.0.framework: Required, threat.0.framework: Required, threat.0.framework: Required, threat.0.framework: Required, and 3 more"`
    );
  });

  test('threat is invalid when updated with missing tactic sub-object', () => {
    const threat: Omit<PatchRuleRequestBody['threat'], 'tactic'> = [
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
    ];

    const payload: Omit<PatchRuleRequestBody['threat'], 'tactic'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"threat.0.tactic: Required, threat.0.tactic: Required, threat.0.tactic: Required, threat.0.tactic: Required, threat.0.tactic: Required, and 3 more"`
    );
  });

  test('threat is valid when updated with missing technique', () => {
    const threat: Omit<PatchRuleRequestBody['threat'], 'technique'> = [
      {
        framework: 'fake',
        tactic: {
          id: 'techniqueId',
          name: 'techniqueName',
          reference: 'techniqueRef',
        },
      },
    ];

    const payload: Omit<PatchRuleRequestBody['threat'], 'technique'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: PatchRuleRequestBody = {
      ...getPatchRulesSchemaMock(),
      timeline_id: 'some-id',
      timeline_title: 'some-title',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<PatchRuleRequestBody, 'severity'> & { severity: string } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      severity: 'junk',
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk', severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk', severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk', severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk', severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk', and 3 more"`
    );
  });

  describe('note', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, note] does validate', () => {
      const payload: PatchRuleRequestBody = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        note: '# some documentation markdown',
      };

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('note can be patched', () => {
      const payload: PatchRuleRequestBody = {
        rule_id: 'rule-1',
        note: '# new documentation markdown',
      };

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('You cannot patch note as an object', () => {
      const payload: Omit<PatchRuleRequestBody, 'note'> & { note: object } = {
        id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
        note: {
          someProperty: 'something else here',
        },
      };

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"note: Expected string, received object, note: Expected string, received object, note: Expected string, received object, note: Expected string, received object, note: Expected string, received object, and 3 more"`
      );
    });
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<PatchRuleRequestBody['actions'], 'group'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.group: Required, type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", actions.0.group: Required, actions.0.group: Required, and 12 more"`
    );
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<PatchRuleRequestBody['actions'], 'id'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.id: Required, type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", actions.0.id: Required, actions.0.id: Required, and 12 more"`
    );
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<PatchRuleRequestBody['actions'], 'params'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.params: Required, type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", actions.0.params: Required, actions.0.params: Required, and 12 more"`
    );
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<PatchRuleRequestBody['actions'], 'actions'> = {
      ...getPatchRulesSchemaMock(),
      actions: [
        {
          group: 'group',
          id: 'id',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    };

    const result = PatchRuleRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.action_type_id: Required, type: Invalid literal value, expected \\"eql\\", language: Invalid literal value, expected \\"eql\\", actions.0.action_type_id: Required, actions.0.action_type_id: Required, and 12 more"`
    );
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, note, and exceptions_list] does validate', () => {
      const payload: PatchRuleRequestBody = {
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
        note: '# some documentation markdown',
        exceptions_list: getListArrayMock(),
      };

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: PatchRuleRequestBody = {
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

      const result = PatchRuleRequestBody.safeParse(payload);
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

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"exceptions_list.0.list_id: Required, exceptions_list.0.type: Required, exceptions_list.0.namespace_type: Invalid enum value. Expected 'agnostic' | 'single', received 'not a namespace type', type: Invalid literal value, expected \\"eql\\", exceptions_list.0.list_id: Required, and 26 more"`
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: PatchRuleRequestBody = {
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

      const result = PatchRuleRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });
});
