/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UUID } from './uuid';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('uuid', () => {
  test('it should validate a uuid', () => {
    const payload = '4656dc92-5832-11ea-8e2d-0242ac130003';
    const decoded = UUID.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a non uuid', () => {
    const payload = '4656dc92-5832-11ea-8e2d';
    const decoded = UUID.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "4656dc92-5832-11ea-8e2d" supplied to "UUID"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an empty string', () => {
    const payload = '';
    const decoded = UUID.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "UUID"']);
    expect(message.schema).toEqual({});
  });
});
