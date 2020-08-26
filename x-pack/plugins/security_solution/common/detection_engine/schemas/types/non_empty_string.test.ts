/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NonEmptyString } from './non_empty_string';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('non_empty_string', () => {
  test('it should validate a regular string', () => {
    const payload = '1';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an empty string', () => {
    const payload = '';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate empty spaces', () => {
    const payload = '  ';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "  " supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });
});
