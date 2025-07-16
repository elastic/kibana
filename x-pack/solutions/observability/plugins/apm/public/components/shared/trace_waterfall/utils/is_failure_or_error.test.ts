/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFailureOrError } from './is_failure_or_error';

describe('isFailureOrError', () => {
  it('returns true for "error"', () => {
    expect(isFailureOrError('error')).toBe(true);
  });

  it('returns true for "failure"', () => {
    expect(isFailureOrError('failure')).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isFailureOrError(undefined)).toBe(false);
  });

  it('returns false for other values', () => {
    expect(isFailureOrError('success')).toBe(false);
    expect(isFailureOrError('pending')).toBe(false);
    expect(isFailureOrError('')).toBe(false);
  });
});
