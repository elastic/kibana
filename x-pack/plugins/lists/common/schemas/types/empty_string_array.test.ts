/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { EmptyStringArray, EmptyStringArrayEncoded } from './empty_string_array';

describe('empty_string_array', () => {
  test('it should validate "null" and create an empty array', () => {
    const payload: EmptyStringArrayEncoded = null;
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });

  test('it should validate "undefined" and create an empty array', () => {
    const payload: EmptyStringArrayEncoded = undefined;
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });

  test('it should validate a single value of "a" into an array of size 1 of ["a"]', () => {
    const payload: EmptyStringArrayEncoded = 'a';
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a']);
  });

  test('it should validate 2 values of "a,b" into an array of size 2 of ["a", "b"]', () => {
    const payload: EmptyStringArrayEncoded = 'a,b';
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b']);
  });

  test('it should validate 3 values of "a,b,c" into an array of size 3 of ["a", "b", "c"]', () => {
    const payload: EmptyStringArrayEncoded = 'a,b,c';
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b', 'c']);
  });

  test('it should NOT validate a number', () => {
    const payload: number = 5;
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "EmptyStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate 3 values of "   a,   b,    c  " into an array of size 3 of ["a", "b", "c"] even though they have spaces', () => {
    const payload: EmptyStringArrayEncoded = '   a,   b,    c  ';
    const decoded = EmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b', 'c']);
  });
});
