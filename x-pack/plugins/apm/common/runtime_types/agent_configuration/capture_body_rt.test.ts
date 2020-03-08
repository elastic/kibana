/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { captureBodyRt } from './capture_body_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('captureBodyRt', () => {
  it('should not accept these values', () => {
    expect(isRight(captureBodyRt.decode(''))).toBe(false);
    expect(isRight(captureBodyRt.decode(0))).toBe(false);
    expect(isRight(captureBodyRt.decode('foo'))).toBe(false);
    expect(isRight(captureBodyRt.decode(true))).toBe(false);
  });

  it('should  accept these values', () => {
    expect(isRight(captureBodyRt.decode('off'))).toBe(true);
    expect(isRight(captureBodyRt.decode('errors'))).toBe(true);
    expect(isRight(captureBodyRt.decode('transactions'))).toBe(true);
    expect(isRight(captureBodyRt.decode('all'))).toBe(true);
  });
});
