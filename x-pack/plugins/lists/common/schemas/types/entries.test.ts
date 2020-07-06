/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  getEntryExistsMock,
  getEntryListMock,
  getEntryMatchAnyMock,
  getEntryMatchMock,
  getEntryNestedMock,
} from './entries.mock';
import {
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  entriesExists,
  entriesList,
  entriesMatch,
  entriesMatchAny,
  entriesNested,
} from './entries';

describe('Entries', () => {
  describe('entriesMatch', () => {
    test('it should validate an entry', () => {
      const payload = getEntryMatchMock();
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryMatchMock();
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryMatchMock();
      payload.operator = 'excluded';
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when "value" is not string', () => {
      const payload: Omit<EntryMatch, 'value'> & { value: string[] } = {
        ...getEntryMatchMock(),
        value: ['some value'],
      };
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "["some value"]" supplied to "value"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "match"', () => {
      const payload: Omit<EntryMatch, 'type'> & { type: string } = {
        ...getEntryMatchMock(),
        type: 'match_any',
      };
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "match_any" supplied to "type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: EntryMatch & {
        extraKey?: string;
      } = getEntryMatchMock();
      payload.extraKey = 'some value';
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryMatchMock());
    });
  });

  describe('entriesMatchAny', () => {
    test('it should validate an entry', () => {
      const payload = getEntryMatchAnyMock();
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryMatchAnyMock();
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "excluded"', () => {
      const payload = getEntryMatchAnyMock();
      payload.operator = 'excluded';
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when value is not string array', () => {
      const payload: Omit<EntryMatchAny, 'value'> & { value: string } = {
        ...getEntryMatchAnyMock(),
        value: 'some string',
      };
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "some string" supplied to "value"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "match_any"', () => {
      const payload: Omit<EntryMatchAny, 'type'> & { type: string } = {
        ...getEntryMatchAnyMock(),
        type: 'match',
      };
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: EntryMatchAny & {
        extraKey?: string;
      } = getEntryMatchAnyMock();
      payload.extraKey = 'some extra key';
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryMatchAnyMock());
    });
  });

  describe('entriesExists', () => {
    test('it should validate an entry', () => {
      const payload = getEntryExistsMock();
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "included"', () => {
      const payload = getEntryExistsMock();
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryExistsMock();
      payload.operator = 'excluded';
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should strip out extra keys', () => {
      const payload: EntryExists & {
        extraKey?: string;
      } = getEntryExistsMock();
      payload.extraKey = 'some extra key';
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryExistsMock());
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

  describe('entriesList', () => {
    test('it should validate an entry', () => {
      const payload = getEntryListMock();
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryListMock();
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryListMock();
      payload.operator = 'excluded';
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when "list" is not expected value', () => {
      const payload: Omit<EntryList, 'list'> & { list: string } = {
        ...getEntryListMock(),
        list: 'someListId',
      };
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "someListId" supplied to "list"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "lists"', () => {
      const payload: Omit<EntryList, 'type'> & { type: 'match_any' } = {
        ...getEntryListMock(),
        type: 'match_any',
      };
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "match_any" supplied to "type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: EntryList & {
        extraKey?: string;
      } = getEntryListMock();
      payload.extraKey = 'some extra key';
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryListMock());
    });
  });

  describe('entriesNested', () => {
    test('it should validate a nested entry', () => {
      const payload = getEntryNestedMock();
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate when "type" is not "nested"', () => {
      const payload: Omit<EntryNested, 'type'> & { type: 'match' } = {
        ...getEntryNestedMock(),
        type: 'match',
      };
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate when "field" is not a string', () => {
      const payload: Omit<EntryNested, 'field'> & {
        field: number;
      } = { ...getEntryNestedMock(), field: 1 };
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "field"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate when "entries" is not a an array', () => {
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

    test('it should NOT validate when "entries" contains an entry item that is not type "match"', () => {
      const payload: Omit<EntryNested, 'entries'> & {
        entries: EntryMatchAny[];
      } = { ...getEntryNestedMock(), entries: [getEntryMatchAnyMock()] };
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "match_any" supplied to "entries,type"',
        'Invalid value "["some host name"]" supplied to "entries,value"',
      ]);
      expect(message.schema).toEqual({});
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
});
