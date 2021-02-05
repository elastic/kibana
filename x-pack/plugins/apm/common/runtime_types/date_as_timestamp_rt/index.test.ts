/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateAsTimestampRt } from './index';
import { isLeft, isRight } from 'fp-ts/lib/Either';

describe('dateAsTimestampRt', () => {
  it('validates whether a string is a valid date', () => {
    expect(isLeft(dateAsTimestampRt.decode(1566299881499))).toBe(true);

    expect(isRight(dateAsTimestampRt.decode('2019-08-20T11:18:31.407Z'))).toBe(
      true
    );
  });

  it('returns the string it was given', () => {
    const either = dateAsTimestampRt.decode('2019-08-20T11:18:31.407Z');

    if (isRight(either)) {
      expect(either.right).toBe(1566299911407);
    } else {
      fail();
    }
  });
});
