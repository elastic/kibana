/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultThrottleNull } from './default_throttle_null';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { Throttle } from '../common/schemas';

describe('default_throttle_null', () => {
  test('it should validate a throttle string', () => {
    const payload: Throttle = 'some string';
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = 5;
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultThreatNull"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default "null" if not provided a value', () => {
    const payload = undefined;
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(null);
  });
});
