/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../shared_imports';

import { getEntryNestedMock } from './entry_nested.mock';
import { EntryNested, entriesNested } from './entry_nested';
import { getEntryMatchAnyMock } from './entry_match_any.mock';
import { getEntryExistsMock } from './entry_exists.mock';

describe('entriesNested', () => {
  test('it should validate a nested entry', () => {
    const payload = getEntryNestedMock();
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when "type" is not "nested"', () => {
    const payload: Omit<EntryNested, 'type'> & { type: 'match' } = {
      ...getEntryNestedMock(),
      type: 'match',
    };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EntryNested, 'field'> & {
      field: string;
    } = { ...getEntryNestedMock(), field: '' };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is not a string', () => {
    const payload: Omit<EntryNested, 'field'> & {
      field: number;
    } = { ...getEntryNestedMock(), field: 1 };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "entries" is not a an array', () => {
    const payload: Omit<EntryNested, 'entries'> & {
      entries: string;
    } = { ...getEntryNestedMock(), entries: 'im a string' };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "im a string" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate when "entries" contains an entry item that is type "match"', () => {
    const payload = { ...getEntryNestedMock(), entries: [getEntryMatchAnyMock()] };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      entries: [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host name'],
        },
      ],
      field: 'parent.field',
      type: 'nested',
    });
  });

  test('it should validate when "entries" contains an entry item that is type "exists"', () => {
    const payload = { ...getEntryNestedMock(), entries: [getEntryExistsMock()] };
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      entries: [
        {
          field: 'host.name',
          operator: 'included',
          type: 'exists',
        },
      ],
      field: 'parent.field',
      type: 'nested',
    });
  });

  test('it should strip out extra keys', () => {
    const payload: EntryNested & {
      extraKey?: string;
    } = getEntryNestedMock();
    payload.extraKey = 'some extra key';
    const decoded = entriesNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryNestedMock());
  });
});
