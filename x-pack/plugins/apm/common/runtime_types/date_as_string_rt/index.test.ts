/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateAsStringRt } from './index';
import { isLeft, isRight } from 'fp-ts/lib/Either';

describe('dateAsStringRt', () => {
  it('validates whether a string is a valid date', () => {
    expect(isLeft(dateAsStringRt.decode(1566299881499))).toBe(true);

    expect(isRight(dateAsStringRt.decode('2019-08-20T11:18:31.407Z'))).toBe(
      true
    );
  });

  it('returns the string it was given', () => {
    const either = dateAsStringRt.decode('2019-08-20T11:18:31.407Z');

    if (isRight(either)) {
      expect(either.right).toBe('2019-08-20T11:18:31.407Z');
    } else {
      fail();
    }
  });
});
