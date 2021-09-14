/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { patchRulesSchema, PatchRulesSchema, PatchRulesSchemaDecoded } from './patch_rules_schema';
import { getPatchRulesSchemaMock, getPatchRulesSchemaDecodedMock } from './patch_rules_schema.mock';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getListArrayMock } from '../types/lists.mock';

describe('patch_rules_schema', () => {
  test('made up values do not validate', () => {
    const payload: PatchRulesSchema & { madeUp: string } = {
      ...getPatchRulesSchemaMock(),
      madeUp: 'hi',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('[id] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, risk_score] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      risk_score: 10,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      risk_score: 10,
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, name] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, name] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, name, severity] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, name, severity] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, name, severity, type] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, name, severity, type] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, name, severity, type, interval] does validate', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query] does validate', () => {
    const payload: PatchRulesSchema = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
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
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    const payload: PatchRulesSchema = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
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
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    const payload: PatchRulesSchema = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
    };
    expect(message.schema).toEqual(expected);
  });

  test('[id, description, from, to, index, name, severity, type, filters] does validate', () => {
    const payload: PatchRulesSchema = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
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
    expect(message.schema).toEqual(expected);
  });

  test('[rule_id, description, from, to, index, name, severity, type, filters] does validate', () => {
    const payload: PatchRulesSchema = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
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
    expect(message.schema).toEqual(expected);
  });

  test('allows references to be sent as a valid value to patch with', () => {
    const payload: PatchRulesSchema = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
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
    expect(message.schema).toEqual(expected);
  });

  test('does not default references to an array', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as PatchRulesSchemaDecoded).references).toEqual(undefined);
  });

  test('does not default interval', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as PatchRulesSchemaDecoded).interval).toEqual(undefined);
  });

  test('does not default max_signals', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as PatchRulesSchemaDecoded).max_signals).toEqual(undefined);
  });

  test('references cannot be numbers', () => {
    const payload: Omit<PatchRulesSchema, 'references'> & { references: number[] } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      references: [5],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "references"']);
    expect(message.schema).toEqual({});
  });

  test('indexes cannot be numbers', () => {
    const payload: Omit<PatchRulesSchema, 'index'> & { index: number[] } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      index: [5],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "index"']);
    expect(message.schema).toEqual({});
  });

  test('saved_id is not required when type is saved_query and will validate without it', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      type: 'saved_query',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      type: 'saved_query',
    };
    expect(message.schema).toEqual(expected);
  });

  test('saved_id validates with type:saved_query', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      type: 'saved_query',
      saved_id: 'some id',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      type: 'saved_query',
      saved_id: 'some id',
    };
    expect(message.schema).toEqual(expected);
  });

  test('saved_query type can have filters with it', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      saved_id: 'some id',
      filters: [],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      saved_id: 'some id',
      filters: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('language validates with kuery', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'kuery',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      query: 'some query',
      language: 'kuery',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language validates with lucene', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'lucene',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);

    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      query: 'some query',
      language: 'lucene',
    };
    expect(message.schema).toEqual(expected);
  });

  test('language does not validate with something made up', () => {
    const payload: Omit<PatchRulesSchema, 'language'> & { language: string } = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      language: 'something-made-up',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "something-made-up" supplied to "language"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be negative', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: -1,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "max_signals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('max_signals cannot be zero', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: 0,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "0" supplied to "max_signals"']);
    expect(message.schema).toEqual({});
  });

  test('max_signals can be 1', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      query: 'some query',
      max_signals: 1,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      query: 'some query',
      max_signals: 1,
    };
    expect(message.schema).toEqual(expected);
  });

  test('meta can be patched', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      meta: { whateverYouWant: 'anything_at_all' },
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      meta: { whateverYouWant: 'anything_at_all' },
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot patch meta as a string', () => {
    const payload: Omit<PatchRulesSchema, 'meta'> & { meta: string } = {
      ...getPatchRulesSchemaMock(),
      meta: 'should not work',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "meta"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('filters cannot be a string', () => {
    const payload: Omit<PatchRulesSchema, 'filters'> & { filters: string } = {
      ...getPatchRulesSchemaMock(),
      filters: 'should not work',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should not work" supplied to "filters"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('name cannot be an empty string', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      name: '',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "name"']);
    expect(message.schema).toEqual({});
  });

  test('description cannot be an empty string', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      description: '',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "description"']);
    expect(message.schema).toEqual({});
  });

  test('threat is not defaulted to empty array on patch', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as PatchRulesSchemaDecoded).threat).toEqual(undefined);
  });

  test('threat is not defaulted to undefined on patch with empty array', () => {
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat: [],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as PatchRulesSchemaDecoded).threat).toEqual([]);
  });

  test('threat is valid when updated with all sub-objects', () => {
    const threat: PatchRulesSchema['threat'] = [
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
    const payload: PatchRulesSchema = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('threat is invalid when updated with missing property framework', () => {
    const threat: Omit<PatchRulesSchema['threat'], 'framework'> = [
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
    const payload: Omit<PatchRulesSchema['threat'], 'framework'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,framework"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('threat is invalid when updated with missing tactic sub-object', () => {
    const threat: Omit<PatchRulesSchema['threat'], 'tactic'> = [
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

    const payload: Omit<PatchRulesSchema['threat'], 'tactic'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "threat,tactic"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('threat is valid when updated with missing technique', () => {
    const threat: Omit<PatchRulesSchema['threat'], 'technique'> = [
      {
        framework: 'fake',
        tactic: {
          id: 'techniqueId',
          name: 'techniqueName',
          reference: 'techniqueRef',
        },
      },
    ];

    const payload: Omit<PatchRulesSchema['threat'], 'technique'> = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      threat,
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: PatchRulesSchema = {
      ...getPatchRulesSchemaMock(),
      timeline_id: 'some-id',
      timeline_title: 'some-title',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: PatchRulesSchemaDecoded = {
      ...getPatchRulesSchemaDecodedMock(),
      timeline_id: 'some-id',
      timeline_title: 'some-title',
    };
    expect(message.schema).toEqual(expected);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload: Omit<PatchRulesSchema, 'severity'> & { severity: string } = {
      id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
      severity: 'junk',
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "junk" supplied to "severity"']);
    expect(message.schema).toEqual({});
  });

  describe('note', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, note] does validate', () => {
      const payload: PatchRulesSchema = {
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

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: PatchRulesSchemaDecoded = {
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
      expect(message.schema).toEqual(expected);
    });

    test('note can be patched', () => {
      const payload: PatchRulesSchema = {
        rule_id: 'rule-1',
        note: '# new documentation markdown',
      };

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: PatchRulesSchemaDecoded = {
        rule_id: 'rule-1',
        note: '# new documentation markdown',
      };
      expect(message.schema).toEqual(expected);
    });

    test('You cannot patch note as an object', () => {
      const payload: Omit<PatchRulesSchema, 'note'> & { note: object } = {
        id: 'b8f95e17-681f-407f-8a5e-b832a77d3831',
        note: {
          someProperty: 'something else here',
        },
      };

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "{"someProperty":"something else here"}" supplied to "note"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    const payload: Omit<PatchRulesSchema['actions'], 'group'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ id: 'id', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,group"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload: Omit<PatchRulesSchema['actions'], 'id'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ group: 'group', action_type_id: 'action_type_id', params: {} }],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload: Omit<PatchRulesSchema['actions'], 'params'> = {
      ...getPatchRulesSchemaMock(),
      actions: [{ group: 'group', id: 'id', action_type_id: 'action_type_id' }],
    };

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,params"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload: Omit<PatchRulesSchema['actions'], 'actions'> = {
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

    const decoded = patchRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "actions,action_type_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, note, and exceptions_list] does validate', () => {
      const payload: PatchRulesSchema = {
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

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: PatchRulesSchemaDecoded = {
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
      const payload: PatchRulesSchema = {
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

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: PatchRulesSchemaDecoded = {
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
      expect(message.schema).toEqual(expected);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload: Omit<PatchRulesSchema, 'exceptions_list'> & {
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

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "exceptions_list,list_id"',
        'Invalid value "undefined" supplied to "exceptions_list,type"',
        'Invalid value "not a namespace type" supplied to "exceptions_list,namespace_type"',
        'Invalid value "[{"id":"uuid_here","namespace_type":"not a namespace type"}]" supplied to "exceptions_list"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: PatchRulesSchema = {
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

      const decoded = patchRulesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: PatchRulesSchemaDecoded = {
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
      expect(message.schema).toEqual(expected);
    });
  });
});
