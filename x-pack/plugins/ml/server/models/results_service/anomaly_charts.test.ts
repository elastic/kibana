/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartLimits } from './anomaly_charts';
import type { ChartPoint } from '../../../common/types/results';

describe('chartLimits', () => {
  test('returns NaN when called without data', () => {
    const limits = chartLimits();
    expect(limits.min).toBeNaN();
    expect(limits.max).toBeNaN();
  });

  test('returns {max: 625736376, min: 201039318} for some test data', () => {
    const data = [
      {
        date: new Date('2017-02-23T08:00:00.000Z'),
        value: 228243469,
        anomalyScore: 63.32916,
        numberOfCauses: 1,
        actual: [228243469],
        typical: [133107.7703441773],
      },
      { date: new Date('2017-02-23T09:00:00.000Z'), value: null },
      { date: new Date('2017-02-23T10:00:00.000Z'), value: null },
      { date: new Date('2017-02-23T11:00:00.000Z'), value: null },
      {
        date: new Date('2017-02-23T12:00:00.000Z'),
        value: 625736376,
        anomalyScore: 97.32085,
        numberOfCauses: 1,
        actual: [625736376],
        typical: [132830.424736973],
      },
      {
        date: new Date('2017-02-23T13:00:00.000Z'),
        value: 201039318,
        anomalyScore: 59.83488,
        numberOfCauses: 1,
        actual: [201039318],
        typical: [132739.5267403542],
      },
    ] as unknown as ChartPoint[];

    const limits = chartLimits(data);

    // {max: 625736376, min: 201039318}
    expect(limits.min).toBe(201039318);
    expect(limits.max).toBe(625736376);
  });

  test("adds 5% padding when min/max are the same, e.g. when there's only one data point", () => {
    const data = [
      {
        date: new Date('2017-02-23T08:00:00.000Z'),
        value: 100,
        anomalyScore: 50,
        numberOfCauses: 1,
        actual: [100],
        typical: [100],
      },
    ] as unknown as ChartPoint[];

    const limits = chartLimits(data);
    expect(limits.min).toBe(95);
    expect(limits.max).toBe(105);
  });

  test('returns minimum of 0 when data includes an anomaly for missing data', () => {
    const data = [
      { date: new Date('2017-02-23T09:00:00.000Z'), value: 22.2 },
      { date: new Date('2017-02-23T10:00:00.000Z'), value: 23.3 },
      { date: new Date('2017-02-23T11:00:00.000Z'), value: 24.4 },
      {
        date: new Date('2017-02-23T12:00:00.000Z'),
        value: null,
        anomalyScore: 97.32085,
        actual: [0],
        typical: [22.2],
      },
      { date: new Date('2017-02-23T13:00:00.000Z'), value: 21.3 },
      { date: new Date('2017-02-23T14:00:00.000Z'), value: 21.2 },
      { date: new Date('2017-02-23T15:00:00.000Z'), value: 21.1 },
    ] as unknown as ChartPoint[];

    const limits = chartLimits(data);
    expect(limits.min).toBe(0);
    expect(limits.max).toBe(24.4);
  });
});
