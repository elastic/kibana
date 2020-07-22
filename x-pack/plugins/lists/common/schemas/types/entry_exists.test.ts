/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getEntryExistsMock } from './entry_exists.mock';
import { EntryExists, entriesExists } from './entry_exists';

describe('entriesExists', () => {
  test('it should validate an entry', () => {
    const payload = { ...getEntryExistsMock() };
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when "operator" is "included"', () => {
    const payload = { ...getEntryExistsMock() };
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when "operator" is "excluded"', () => {
    const payload = { ...getEntryExistsMock() };
    payload.operator = 'excluded';
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate when "field" is empty string', () => {
    const payload: Omit<EntryExists, 'field'> & { field: string } = {
      ...getEntryExistsMock(),
      field: '',
    };
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EntryExists & {
      extraKey?: string;
    } = { ...getEntryExistsMock() };
    payload.extraKey = 'some extra key';
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({ ...getEntryExistsMock() });
  });

  test('it should not validate when "type" is not "exists"', () => {
    const payload: Omit<EntryExists, 'type'> & { type: string } = {
      ...getEntryExistsMock(),
      type: 'match',
    };
    const decoded = entriesExists.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });
});
