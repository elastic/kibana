/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IsoDateString } from './iso_date_string';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('ios_date_string', () => {
  test('it should validate a iso string', () => {
    const payload = '2020-02-26T00:32:34.541Z';
    const decoded = IsoDateString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an epoch number', () => {
    const payload = '1582677283067';
    const decoded = IsoDateString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1582677283067" supplied to "IsoDateString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a number such as 2000', () => {
    const payload = '2000';
    const decoded = IsoDateString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "2000" supplied to "IsoDateString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a UTC', () => {
    const payload = 'Wed, 26 Feb 2020 00:36:20 GMT';
    const decoded = IsoDateString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "Wed, 26 Feb 2020 00:36:20 GMT" supplied to "IsoDateString"',
    ]);
    expect(message.schema).toEqual({});
  });
});
