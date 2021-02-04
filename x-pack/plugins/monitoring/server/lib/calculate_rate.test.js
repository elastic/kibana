/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRate } from './calculate_rate';

describe('Calculate Rate', () => {
  it('returns null when all fields are undefined', () => {
    const { rate, isEstimate } = calculateRate({});
    expect(rate).toBe(null);
    expect(isEstimate).toBe(false);
  });

  it('returns null when time window size is 0', () => {
    const { rate, isEstimate } = calculateRate({
      hitTimestamp: '2017-08-08T18:33:04.501Z',
      earliestHitTimestamp: '2017-08-08T17:33:04.501Z',
      latestTotal: 24924,
      earliestTotal: 18945,
      timeWindowMin: '2017-08-08T17:33:04.501Z',
      timeWindowMax: '2017-08-08T17:33:04.501Z', // max === min
    });
    expect(rate).toBe(null);
    expect(isEstimate).toBe(false);
  });

  it('returns null when time between latest hit and earliest hit 0', () => {
    const { rate, isEstimate } = calculateRate({
      hitTimestamp: '2017-08-08T18:33:04.501Z',
      earliestHitTimestamp: '2017-08-08T18:33:04.501Z', // latest === earliest
      latestTotal: 24924,
      earliestTotal: 18945,
      timeWindowMin: '2017-08-08T17:33:04.501Z',
      timeWindowMax: '2017-08-08T18:33:04.501Z',
    });
    expect(rate).toBe(null);
    expect(isEstimate).toBe(false);
  });

  it('calculates a rate over time', () => {
    const { rate, isEstimate } = calculateRate({
      hitTimestamp: '2017-08-08T18:33:04.501Z',
      earliestHitTimestamp: '2017-08-08T17:33:04.501Z',
      latestTotal: 24924,
      earliestTotal: 18945,
      timeWindowMin: '2017-08-08T17:33:04.501Z',
      timeWindowMax: '2017-08-08T18:33:04.501Z',
    });
    expect(rate).toBe(1.6608333333333334);
    expect(isEstimate).toBe(false);
  });

  it('calculates zero as the rate if latest - earliest is 0', () => {
    const { rate, isEstimate } = calculateRate({
      hitTimestamp: '2017-08-08T18:33:04.501Z',
      earliestHitTimestamp: '2017-08-08T17:33:04.501Z',
      latestTotal: 18945,
      earliestTotal: 18945,
      timeWindowMin: '2017-08-08T17:33:04.501Z',
      timeWindowMax: '2017-08-08T18:33:04.501Z',
    });
    expect(rate).toBe(0);
    expect(isEstimate).toBe(false);
  });

  it('calculates rate based on latest metric if the count metric reset', () => {
    const { rate, isEstimate } = calculateRate({
      hitTimestamp: '2017-08-08T18:33:04.501Z',
      earliestHitTimestamp: '2017-08-08T17:33:04.501Z',
      latestTotal: 20000,
      earliestTotal: 40000,
      timeWindowMin: '2017-08-08T17:33:04.501Z',
      timeWindowMax: '2017-08-08T18:33:04.501Z',
    });
    expect(rate).toBe(5.555555555555555);
    expect(isEstimate).toBe(true);
  });
});
