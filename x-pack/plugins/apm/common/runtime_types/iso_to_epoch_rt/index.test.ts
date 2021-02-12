/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from './index';
import { isRight } from 'fp-ts/lib/Either';

describe('isoToEpochRt', () => {
  it('validates whether its input is a valid ISO timestamp', () => {
    expect(isRight(isoToEpochRt.decode(1566299881499))).toBe(false);

    expect(isRight(isoToEpochRt.decode('2019-08-20T11:18:31.407Z'))).toBe(true);
  });

  it('decodes valid ISO timestamps to a epoch number', () => {
    const iso = '2019-08-20T11:18:31.407Z';
    const result = isoToEpochRt.decode(iso);

    if (isRight(result)) {
      expect(result.right).toBe(new Date(iso).getTime());
    } else {
      fail();
    }
  });

  it('encodes epoch time to ISO string', () => {
    expect(isoToEpochRt.encode(1566299911407)).toBe('2019-08-20T11:18:31.407Z');
  });
});
