/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../shared_imports';

import { getEntryMatchWildcardMock } from './entry_match_wildcard.mock';
import { EntryMatchWildcard, entriesMatchWildcard } from './entry_match_wildcard';

describe('entriesMatchWildcard', () => {
  test('it should validate an entry', () => {
    const payload = getEntryMatchWildcardMock();
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when operator is "included"', () => {
    const payload = getEntryMatchWildcardMock();
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when "operator" is "excluded"', () => {
    const payload = getEntryMatchWildcardMock();
    payload.operator = 'excluded';
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EntryMatchWildcard, 'field'> & { field: string } = {
      ...getEntryMatchWildcardMock(),
      field: '',
    };
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is not string', () => {
    const payload: Omit<EntryMatchWildcard, 'value'> & { value: string[] } = {
      ...getEntryMatchWildcardMock(),
      value: ['some value'],
    };
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["some value"]" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is empty string', () => {
    const payload: Omit<EntryMatchWildcard, 'value'> & { value: string } = {
      ...getEntryMatchWildcardMock(),
      value: '',
    };
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "wildcard"', () => {
    const payload: Omit<EntryMatchWildcard, 'type'> & { type: string } = {
      ...getEntryMatchWildcardMock(),
      type: 'match',
    };
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EntryMatchWildcard & {
      extraKey?: string;
    } = getEntryMatchWildcardMock();
    payload.extraKey = 'some value';
    const decoded = entriesMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchWildcardMock());
  });
});
