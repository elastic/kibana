/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNoAnomalyScore } from '.';

describe('isNoAnomalyScore', () => {
  it('returns false when the score is undefined', () => {
    expect(isNoAnomalyScore(undefined)).toBe(false);
  });

  it('returns true when the score is exactly zero', () => {
    expect(isNoAnomalyScore(0)).toBe(true);
  });

  it('returns true for any score lower than 0.01', () => {
    expect(isNoAnomalyScore(0.001)).toBe(true);
    expect(isNoAnomalyScore(0.005)).toBe(true);
    expect(isNoAnomalyScore(0.009)).toBe(true);
  });

  it('returns false when the score is 0.01 or above', () => {
    expect(isNoAnomalyScore(0.01)).toBe(false);
    expect(isNoAnomalyScore(0.02)).toBe(false);
  });

  it('returns false for clearly non-zero scores', () => {
    expect(isNoAnomalyScore(1)).toBe(false);
    expect(isNoAnomalyScore(75)).toBe(false);
    expect(isNoAnomalyScore(100)).toBe(false);
  });

  it('coerces non-number values before comparing', () => {
    expect(isNoAnomalyScore('0.005' as unknown as number)).toBe(true);
    expect(isNoAnomalyScore('5' as unknown as number)).toBe(false);
  });
});
