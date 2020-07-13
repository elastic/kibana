/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../../test_utils';

import { getListAgnosticMock, getListMock, getListArrayMock } from './lists.mock';
import {
  List,
  ListArray,
  ListArrayOrUndefined,
  list,
  listArray,
  listArrayOrUndefined,
} from './lists';

describe('Lists', () => {
  describe('list', () => {
    test('it should validate a list', () => {
      const payload = getListMock();
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a list with "namespace_type" of "agnostic"', () => {
      const payload = getListAgnosticMock();
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate a list without an "id"', () => {
      const payload = getListMock();
      delete payload.id;
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "id"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a list without "namespace_type"', () => {
      const payload = getListMock();
      delete payload.namespace_type;
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: List & {
        extraKey?: string;
      } = getListMock();
      payload.extraKey = 'some value';
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getListMock());
    });
  });

  describe('listArray', () => {
    test('it should validate an array of lists', () => {
      const payload = getListArrayMock();
      const decoded = listArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when unexpected type found in array', () => {
      const payload = ([1] as unknown) as ListArray;
      const decoded = listArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| id: string, type: "detection" | "endpoint", namespace_type: "agnostic" | "single" |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('listArrayOrUndefined', () => {
    test('it should validate an array of lists', () => {
      const payload = getListArrayMock();
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not allow an item that is not of type "list" in array', () => {
      const payload = ([1] as unknown) as ListArrayOrUndefined;
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "(Array<{| id: string, type: "detection" | "endpoint", namespace_type: "agnostic" | "single" |}> | undefined)"',
        'Invalid value "[1]" supplied to "(Array<{| id: string, type: "detection" | "endpoint", namespace_type: "agnostic" | "single" |}> | undefined)"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
