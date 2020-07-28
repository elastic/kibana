/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PositiveIntegerGreaterThanZero } from './positive_integer_greater_than_zero';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('positive_integer_greater_than_zero', () => {
  test('it should validate a positive number', () => {
    const payload = 1;
    const decoded = PositiveIntegerGreaterThanZero.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a zero', () => {
    const payload = 0;
    const decoded = PositiveIntegerGreaterThanZero.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a negative number', () => {
    const payload = -1;
    const decoded = PositiveIntegerGreaterThanZero.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a string', () => {
    const payload = 'some string';
    const decoded = PositiveIntegerGreaterThanZero.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });
});
