/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../../shared_imports';
import { getEntryExistsMock } from '../entry_exists.mock';
import { getEntryListMock } from '../entry_list.mock';

import { getEndpointEntryMatchMock } from './entry_match.mock';
import { getEndpointEntryMatchAnyMock } from './entry_match_any.mock';
import { getEndpointEntryNestedMock } from './entry_nested.mock';
import { getEndpointEntriesArrayMock } from './entries.mock';
import {
  NonEmptyEndpointEntriesArray,
  endpointEntriesArray,
  nonEmptyEndpointEntriesArray,
} from './entries';

describe('Endpoint', () => {
  describe('entriesArray', () => {
    test('it should validate an array with match entry', () => {
      const payload = [getEndpointEntryMatchMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with match_any entry', () => {
      const payload = [getEndpointEntryMatchAnyMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate an empty array', () => {
      const payload: NonEmptyEndpointEntriesArray = [];
      const decoded = nonEmptyEndpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "[]" supplied to "NonEmptyEndpointEntriesArray"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('type guard for nonEmptyEndpointNestedEntries should allow array of endpoint entries', () => {
      const payload: NonEmptyEndpointEntriesArray = [getEndpointEntryMatchAnyMock()];
      const guarded = nonEmptyEndpointEntriesArray.is(payload);
      expect(guarded).toBeTruthy();
    });

    test('type guard for nonEmptyEndpointNestedEntries should disallow empty arrays', () => {
      const payload: NonEmptyEndpointEntriesArray = [];
      const guarded = nonEmptyEndpointEntriesArray.is(payload);
      expect(guarded).toBeFalsy();
    });

    test('it should NOT validate an array with exists entry', () => {
      const payload = [getEntryExistsMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "exists" supplied to "type"',
        'Invalid value "undefined" supplied to "value"',
        'Invalid value "undefined" supplied to "entries"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an array with list entry', () => {
      const payload = [getEntryListMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "list" supplied to "type"',
        'Invalid value "undefined" supplied to "value"',
        'Invalid value "undefined" supplied to "entries"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should validate an array with nested entry', () => {
      const payload = [getEndpointEntryNestedMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with all types of entries', () => {
      const payload = getEndpointEntriesArrayMock();
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });
});
