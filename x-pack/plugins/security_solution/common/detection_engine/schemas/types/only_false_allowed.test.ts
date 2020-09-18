/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { OnlyFalseAllowed } from './only_false_allowed';

describe('only_false_allowed', () => {
  test('it should validate a boolean false as false', () => {
    const payload = false;
    const decoded = OnlyFalseAllowed.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a boolean true', () => {
    const payload = true;
    const decoded = OnlyFalseAllowed.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "true" supplied to "DefaultBooleanTrue"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = OnlyFalseAllowed.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultBooleanTrue"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default false', () => {
    const payload = null;
    const decoded = OnlyFalseAllowed.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(false);
  });
});
