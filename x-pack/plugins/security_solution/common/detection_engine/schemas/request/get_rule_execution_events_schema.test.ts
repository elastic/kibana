/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import {
  DefaultSortField,
  DefaultSortOrder,
  DefaultStatusFiltersStringArray,
} from './get_rule_execution_events_schema';

describe('get_rule_execution_events_schema', () => {
  describe('DefaultStatusFiltersStringArray', () => {
    test('it should validate a single ruleExecutionStatus', () => {
      const payload = 'succeeded';
      const decoded = DefaultStatusFiltersStringArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual([payload]);
    });
    test('it should validate an array of ruleExecutionStatus joined by "\'"', () => {
      const payload = ['succeeded', 'failed'];
      const decoded = DefaultStatusFiltersStringArray.decode(payload.join(','));
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate an invalid ruleExecutionStatus', () => {
      const payload = ['value 1', 5].join(',');
      const decoded = DefaultStatusFiltersStringArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "value 1" supplied to "DefaultStatusFiltersStringArray"',
        'Invalid value "5" supplied to "DefaultStatusFiltersStringArray"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should return a default array entry', () => {
      const payload = null;
      const decoded = DefaultStatusFiltersStringArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual([]);
    });
  });
  describe('DefaultSortField', () => {
    test('it should validate a valid sort field', () => {
      const payload = 'duration_ms';
      const decoded = DefaultSortField.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate an invalid sort field', () => {
      const payload = 'es_search_duration_ms';
      const decoded = DefaultSortField.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "es_search_duration_ms" supplied to "DefaultSortField"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should return the default sort field "timestamp"', () => {
      const payload = null;
      const decoded = DefaultSortField.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual('timestamp');
    });
  });
  describe('DefaultSortOrder', () => {
    test('it should validate a valid sort order', () => {
      const payload = 'asc';
      const decoded = DefaultSortOrder.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate an invalid sort order', () => {
      const payload = 'behind_you';
      const decoded = DefaultSortOrder.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "behind_you" supplied to "DefaultSortOrder"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should return the default sort order "desc"', () => {
      const payload = null;
      const decoded = DefaultSortOrder.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual('desc');
    });
  });
});
