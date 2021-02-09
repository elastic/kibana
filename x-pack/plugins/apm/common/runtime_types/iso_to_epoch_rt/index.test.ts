/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from './index';
import { isRight } from 'fp-ts/lib/Either';

describe('isoToEpochRt', () => {
  it('validates whether a string is a valid date', () => {
    expect(isoToEpochRt.is(1566299881499)).toBe(false);
    expect(isoToEpochRt.is('2019-08-20T11:18:31.407Z')).toBe(true);
  });

  it('returns the string it was given', () => {
    const either = isoToEpochRt.decode('2019-08-20T11:18:31.407Z');
    if (isRight(either)) {
      expect(either.right).toBe(1566299911407);
    } else {
      fail();
    }
  });

  it('encodes timestamp to ISO string', () => {
    expect(isoToEpochRt.encode(1566299911407)).toBe('2019-08-20T11:18:31.407Z');
  });
});
