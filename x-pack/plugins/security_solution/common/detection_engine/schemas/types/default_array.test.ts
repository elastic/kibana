/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { DefaultArray } from './default_array';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

const testSchema = t.keyof({
  valid: true,
  also_valid: true,
});
type TestSchema = t.TypeOf<typeof testSchema>;

const defaultArraySchema = DefaultArray(testSchema);

describe('default_array', () => {
  test('it should validate an empty array', () => {
    const payload: string[] = [];
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of testSchema', () => {
    const payload: TestSchema[] = ['valid'];
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of valid testSchema strings', () => {
    const payload = ['valid', 'also_valid'];
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = ['valid', 123];
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "123" supplied to "DefaultArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an array with an invalid string', () => {
    const payload = ['valid', 'invalid'];
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid" supplied to "DefaultArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = defaultArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
