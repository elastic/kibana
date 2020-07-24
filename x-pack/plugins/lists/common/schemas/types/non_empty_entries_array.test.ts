/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getEntryMatchMock } from './entry_match.mock';
import { getEntryMatchAnyMock } from './entry_match_any.mock';
import { getEntryListMock } from './entry_list.mock';
import { getEntryExistsMock } from './entry_exists.mock';
import { getEntryNestedMock } from './entry_nested.mock';
import { getEntriesArrayMock } from './entries.mock';
import { nonEmptyEntriesArray } from './non_empty_entries_array';
import { EntriesArray } from './entries';

describe('non_empty_entries_array', () => {
  test('it should NOT validate an empty array', () => {
    const payload: EntriesArray = [];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate "undefined"', () => {
    const payload = undefined;
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate "null"', () => {
    const payload = null;
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of "match" entries', () => {
    const payload: EntriesArray = [{ ...getEntryMatchMock() }, { ...getEntryMatchMock() }];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "match_any" entries', () => {
    const payload: EntriesArray = [{ ...getEntryMatchAnyMock() }, { ...getEntryMatchAnyMock() }];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "exists" entries', () => {
    const payload: EntriesArray = [{ ...getEntryExistsMock() }, { ...getEntryExistsMock() }];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "list" entries', () => {
    const payload: EntriesArray = [{ ...getEntryListMock() }, { ...getEntryListMock() }];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "nested" entries', () => {
    const payload: EntriesArray = [{ ...getEntryNestedMock() }, { ...getEntryNestedMock() }];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of entries', () => {
    const payload: EntriesArray = [...getEntriesArrayMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate an array of non entries', () => {
    const payload = [1];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
