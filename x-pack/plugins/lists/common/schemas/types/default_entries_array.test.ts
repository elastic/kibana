/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { DefaultEntryArray } from './default_entries_array';
import { EntriesArray } from './entries';
import { getEntriesArray, getEntryMatch, getEntryNested } from './entries.mock';

describe('default_entries_array', () => {
  test('it should validate an empty array', () => {
    const payload: EntriesArray = [];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of regular and nested entries', () => {
    const payload: EntriesArray = getEntriesArray();
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of nested entries', () => {
    const payload: EntriesArray = [{ ...getEntryNested() }];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of non nested entries', () => {
    const payload: EntriesArray = [{ ...getEntryMatch() }];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    // TODO: Known weird error formatting that is on our list to address
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to ""',
      'Invalid value "1" supplied to ""',
      'Invalid value "1" supplied to ""',
      'Invalid value "1" supplied to ""',
      'Invalid value "1" supplied to ""',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to ""',
      'Invalid value "some string" supplied to ""',
      'Invalid value "some string" supplied to ""',
      'Invalid value "some string" supplied to ""',
      'Invalid value "some string" supplied to ""',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultEntryArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
