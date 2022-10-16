/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import type { FullResponseSchema } from './rule_schemas';
import { fullResponseSchema } from './rule_schemas';
import {
  getRulesSchemaMock,
  getRulesMlSchemaMock,
  getSavedQuerySchemaMock,
  getThreatMatchingSchemaMock,
  getRulesEqlSchemaMock,
} from './rule_response_schema.mock';

describe('Rule response schema', () => {
  test('it should validate a type of "query" without anything extra', () => {
    const payload = getRulesSchemaMock();

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getRulesSchemaMock();

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "query" when it has extra data', () => {
    const payload: FullResponseSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate invalid_data for the type', () => {
    const payload: Omit<FullResponseSchema, 'type'> & { type: string } = getRulesSchemaMock();
    payload.type = 'invalid_data';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toHaveLength(1);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "query" with a saved_id together', () => {
    const payload: FullResponseSchema & { saved_id?: string } = getRulesSchemaMock();
    payload.type = 'query';
    payload.saved_id = 'save id 123';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a type of "saved_query" with a "saved_id" dependent', () => {
    const payload = getSavedQuerySchemaMock();

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getSavedQuerySchemaMock();

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "saved_query" without a "saved_id" dependent', () => {
    const payload: FullResponseSchema & { saved_id?: string } = getSavedQuerySchemaMock();
    // @ts-expect-error
    delete payload.saved_id;

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "saved_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a type of "saved_query" when it has extra data', () => {
    const payload: FullResponseSchema & { saved_id?: string; invalid_extra_data?: string } =
      getSavedQuerySchemaMock();
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate a type of "timeline_id" if there is a "timeline_title" dependent', () => {
    const payload = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected = getRulesSchemaMock();
    expected.timeline_id = 'some timeline id';
    expected.timeline_title = 'some timeline title';

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should NOT validate a type of "timeline_id" if there is "timeline_title" dependent when it has extra invalid data', () => {
    const payload: FullResponseSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    payload.timeline_id = 'some timeline id';
    payload.timeline_title = 'some timeline title';
    payload.invalid_extra_data = 'invalid_extra_data';

    const decoded = fullResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  describe('exceptions_list', () => {
    test('it should validate an empty array for "exceptions_list"', () => {
      const payload = getRulesSchemaMock();
      payload.exceptions_list = [];
      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = getRulesSchemaMock();
      expected.exceptions_list = [];
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate when "exceptions_list" is not expected type', () => {
      const payload: Omit<FullResponseSchema, 'exceptions_list'> & {
        exceptions_list?: string;
      } = { ...getRulesSchemaMock(), exceptions_list: 'invalid_data' };

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid_data" supplied to "exceptions_list"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('data_view_id', () => {
    test('it should validate a type of "query" with "data_view_id" defined', () => {
      const payload = { ...getRulesSchemaMock(), data_view_id: 'logs-*' };

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = { ...getRulesSchemaMock(), data_view_id: 'logs-*' };

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should validate a type of "saved_query" with "data_view_id" defined', () => {
      const payload: FullResponseSchema & { saved_id?: string; data_view_id?: string } =
        getSavedQuerySchemaMock();
      payload.data_view_id = 'logs-*';

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected: FullResponseSchema & { saved_id?: string; data_view_id?: string } =
        getSavedQuerySchemaMock();

      expected.data_view_id = 'logs-*';

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should validate a type of "eql" with "data_view_id" defined', () => {
      const payload = { ...getRulesEqlSchemaMock(), data_view_id: 'logs-*' };

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = { ...getRulesEqlSchemaMock(), data_view_id: 'logs-*' };

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should validate a type of "threat_match" with "data_view_id" defined', () => {
      const payload = { ...getThreatMatchingSchemaMock(), data_view_id: 'logs-*' };

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      const expected = { ...getThreatMatchingSchemaMock(), data_view_id: 'logs-*' };

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('it should NOT validate a type of "machine_learning" with "data_view_id" defined', () => {
      const payload = { ...getRulesMlSchemaMock(), data_view_id: 'logs-*' };

      const decoded = fullResponseSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "data_view_id"']);
      expect(message.schema).toEqual({});
    });
  });
});
