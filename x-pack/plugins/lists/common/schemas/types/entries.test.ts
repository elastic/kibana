/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  getEntryExists,
  getEntryList,
  getEntryMatch,
  getEntryMatchAny,
  getEntryNested,
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
      const payload = getEntryMatch();
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryMatch();
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryMatch();
      payload.operator = 'excluded';
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when "value" is not string', () => {
      const payload: Omit<EntryMatch, 'value'> & { value: string[] } = {
        ...getEntryMatch(),
        value: ['some value'],
      };
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "some value" supplied to "value"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "match"', () => {
      const payload: Omit<EntryMatch, 'type'> & { type: string } = {
        ...getEntryMatch(),
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
      } = getEntryMatch();
      payload.extraKey = 'some value';
      const decoded = entriesMatch.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryMatch());
    });
  });

  describe('entriesMatchAny', () => {
    test('it should validate an entry', () => {
      const payload = getEntryMatchAny();
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryMatchAny();
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "excluded"', () => {
      const payload = getEntryMatchAny();
      payload.operator = 'excluded';
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when value is not string array', () => {
      const payload: Omit<EntryMatchAny, 'value'> & { value: string } = {
        ...getEntryMatchAny(),
        value: 'some string',
      };
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "some string" supplied to ""',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "match_any"', () => {
      const payload: Omit<EntryMatchAny, 'type'> & { type: string } = {
        ...getEntryMatchAny(),
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
      } = getEntryMatchAny();
      payload.extraKey = 'some extra key';
      const decoded = entriesMatchAny.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryMatchAny());
    });
  });

  describe('entriesExists', () => {
    test('it should validate an entry', () => {
      const payload = getEntryExists();
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "included"', () => {
      const payload = getEntryExists();
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryExists();
      payload.operator = 'excluded';
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should strip out extra keys', () => {
      const payload: EntryExists & {
        extraKey?: string;
      } = getEntryExists();
      payload.extraKey = 'some extra key';
      const decoded = entriesExists.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryExists());
    });

    test('it should not validate when "type" is not "exists"', () => {
      const payload: Omit<EntryExists, 'type'> & { type: string } = {
        ...getEntryExists(),
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
      const payload = getEntryList();
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when operator is "included"', () => {
      const payload = getEntryList();
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when "operator" is "excluded"', () => {
      const payload = getEntryList();
      payload.operator = 'excluded';
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when "value" is not string array', () => {
      const payload: Omit<EntryList, 'value'> & { value: string } = {
        ...getEntryList(),
        value: 'someListId',
      };
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "someListId" supplied to ""']);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "type" is not "lists"', () => {
      const payload: Omit<EntryList, 'type'> & { type: 'match_any' } = {
        ...getEntryList(),
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
      } = getEntryList();
      payload.extraKey = 'some extra key';
      const decoded = entriesList.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryList());
    });
  });

  describe('entriesNested', () => {
    test('it should validate a nested entry', () => {
      const payload = getEntryNested();
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate when "type" is not "nested"', () => {
      const payload: Omit<EntryNested, 'type'> & { type: 'match' } = {
        ...getEntryNested(),
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
      } = { ...getEntryNested(), field: 1 };
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "field"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate when "entries" is not a an array', () => {
      const payload: Omit<EntryNested, 'entries'> & {
        entries: string;
      } = { ...getEntryNested(), entries: 'im a string' };
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "im a string" supplied to "entries"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: EntryNested & {
        extraKey?: string;
      } = getEntryNested();
      payload.extraKey = 'some extra key';
      const decoded = entriesNested.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getEntryNested());
    });
  });
});
