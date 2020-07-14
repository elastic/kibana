/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { NonEmptyStringArray, NonEmptyStringArrayEncoded } from './non_empty_string_array';

describe('non_empty_string_array', () => {
  test('it should NOT validate "null"', () => {
    const payload: NonEmptyStringArrayEncoded | null = null;
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "NonEmptyStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate "undefined"', () => {
    const payload: NonEmptyStringArrayEncoded | undefined = undefined;
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "NonEmptyStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a single value of an empty string ""', () => {
    const payload: NonEmptyStringArrayEncoded = '';
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "NonEmptyStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate a single value of "a" into an array of size 1 of ["a"]', () => {
    const payload: NonEmptyStringArrayEncoded = 'a';
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a']);
  });

  test('it should validate 2 values of "a,b" into an array of size 2 of ["a", "b"]', () => {
    const payload: NonEmptyStringArrayEncoded = 'a,b';
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b']);
  });

  test('it should validate 3 values of "a,b,c" into an array of size 3 of ["a", "b", "c"]', () => {
    const payload: NonEmptyStringArrayEncoded = 'a,b,c';
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b', 'c']);
  });

  test('it should NOT validate a number', () => {
    const payload: number = 5;
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "NonEmptyStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate 3 values of "   a,   b,    c  " into an array of size 3 of ["a", "b", "c"] even though they have spaces', () => {
    const payload: NonEmptyStringArrayEncoded = '   a,   b,    c  ';
    const decoded = NonEmptyStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['a', 'b', 'c']);
  });
});
