/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorWithReason, getReasonFromError, isErrorWithReason } from './error_with_reason';

describe('ErrorWithReason', () => {
  const plainError = new Error('well, actually');
  const errorWithReason = new ErrorWithReason('decrypt', plainError);

  test('ErrorWithReason class', () => {
    expect(errorWithReason.message).toBe(plainError.message);
    expect(errorWithReason.error).toBe(plainError);
    expect(errorWithReason.reason).toBe('decrypt');
  });

  test('getReasonFromError()', () => {
    expect(getReasonFromError(plainError)).toBe('unknown');
    expect(getReasonFromError(errorWithReason)).toBe('decrypt');
  });

  test('isErrorWithReason()', () => {
    expect(isErrorWithReason(plainError)).toBe(false);
    expect(isErrorWithReason(errorWithReason)).toBe(true);
  });
});
