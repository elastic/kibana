/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fullJitterBackoffFactory } from './full_jitter_backoff';

describe('FullJitterBackoff', () => {
  it('throws if the baseDelay is negative', async () => {
    expect(() =>
      fullJitterBackoffFactory({ baseDelay: -1, maxBackoffTime: 2000 }).create()
    ).toThrowErrorMatchingInlineSnapshot(`"baseDelay must not be negative"`);
  });

  it('throws if the maxBackoffTime is negative', async () => {
    expect(() =>
      fullJitterBackoffFactory({ baseDelay: 5, maxBackoffTime: -1 }).create()
    ).toThrowErrorMatchingInlineSnapshot(`"maxBackoffTime must not be negative"`);
  });

  it('starts with minimum of 1ms', () => {
    const backoff = fullJitterBackoffFactory({ baseDelay: 0, maxBackoffTime: 4 }).create();
    expect(backoff.nextBackOff()).toBeGreaterThanOrEqual(1);
  });

  it('caps based on the maxBackoffTime', () => {
    const maxBackoffTime = 4;

    const backoff = fullJitterBackoffFactory({ baseDelay: 1, maxBackoffTime }).create();

    for (const _ of Array.from({ length: 1000 })) {
      // maxBackoffTime plus the minimum 1ms
      expect(backoff.nextBackOff()).toBeLessThanOrEqual(maxBackoffTime + 1);
    }
  });

  it('caps retries', () => {
    // 2^53 − 1
    const maxBackoffTime = Number.MAX_SAFE_INTEGER;
    // The ceiling for the tries is 2^32
    const expectedCappedBackOff = Math.pow(2, 32);

    const backoff = fullJitterBackoffFactory({ baseDelay: 1, maxBackoffTime }).create();

    for (const _ of Array.from({ length: 1000 })) {
      // maxBackoffTime plus the minimum 1ms
      expect(backoff.nextBackOff()).toBeLessThanOrEqual(expectedCappedBackOff + 1);
    }
  });

  it('returns a random number between the expected range correctly', () => {
    const baseDelay = 5;
    const maxBackoffTime = 2000;
    // 2^11 = 4096 > maxBackoffTime
    const totalTries = 12;

    const backoff = fullJitterBackoffFactory({ baseDelay, maxBackoffTime }).create();

    for (const index of Array.from(Array(totalTries).keys())) {
      const maxExpectedRange = Math.min(maxBackoffTime, baseDelay * Math.pow(2, index));
      const nextBackOff = backoff.nextBackOff();

      expect(nextBackOff).toBeGreaterThanOrEqual(1);
      expect(nextBackOff).toBeLessThanOrEqual(maxExpectedRange + 1);
    }
  });
});
