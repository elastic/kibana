/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { nonEmptyOrNullableStringArray } from './non_empty_or_nullable_string_array';

describe('nonEmptyOrNullableStringArray', () => {
  test('it should NOT validate an empty array', () => {
    const payload: string[] = [];
    const decoded = nonEmptyOrNullableStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "NonEmptyOrNullableStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate "undefined"', () => {
    const payload = undefined;
    const decoded = nonEmptyOrNullableStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "NonEmptyOrNullableStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate "null"', () => {
    const payload = null;
    const decoded = nonEmptyOrNullableStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "NonEmptyOrNullableStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an array of with an empty string', () => {
    const payload: string[] = ['im good', ''];
    const decoded = nonEmptyOrNullableStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["im good",""]" supplied to "NonEmptyOrNullableStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an array of non strings', () => {
    const payload = [1];
    const decoded = nonEmptyOrNullableStringArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[1]" supplied to "NonEmptyOrNullableStringArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
