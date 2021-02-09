/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Coordinate } from '../../typings/timeseries';
import { mergePeriodsTimeseries } from './merge_periods_timeseries';

describe('mergePeriodsTimeseries', () => {
  it('returns empty array when timeseries is empty', () => {
    expect(
      mergePeriodsTimeseries({
        currentPeriodTimeseries: [],
        previousPeriodTimeseries: [],
      })
    ).toEqual([]);
  });
  it('returns empty array when comparison timeseries is undefined', () => {
    expect(
      mergePeriodsTimeseries({
        currentPeriodTimeseries: [],
        previousPeriodTimeseries: undefined,
      })
    ).toEqual([]);
  });

  it('returns empty array when current period timeseries is empty', () => {
    const currentPeriodTimeseries: Coordinate[] = [];
    const previousPeriodTimeseries = [
      { x: 10, y: 10 },
      { x: 11, y: 11 },
      { x: 12, y: 12 },
      { x: 13, y: 13 },
      { x: 14, y: undefined },
    ];
    expect(
      mergePeriodsTimeseries({
        currentPeriodTimeseries,
        previousPeriodTimeseries,
      })
    ).toEqual([]);
  });

  it('returns empty array when previous period timeseries is empty', () => {
    const currentPeriodTimeseries = [
      { x: 20, y: 20 },
      { x: 21, y: 21 },
      { x: 22, y: null },
      { x: 23, y: 0 },
      { x: 24, y: undefined },
    ];
    const previousPeriodTimeseries: Coordinate[] = [];
    expect(
      mergePeriodsTimeseries({
        currentPeriodTimeseries,
        previousPeriodTimeseries,
      })
    ).toEqual([]);
  });

  it('merges timeseries and comparison data', () => {
    const currentPeriodTimeseries = [
      { x: 20, y: 20 },
      { x: 21, y: 21 },
      { x: 22, y: null },
      { x: 23, y: 0 },
      { x: 24, y: undefined },
    ];
    const previousPeriodTimeseries = [
      { x: 10, y: 10 },
      { x: 11, y: 11 },
      { x: 12, y: 12 },
      { x: 13, y: 13 },
      { x: 14, y: undefined },
    ];
    expect(
      mergePeriodsTimeseries({
        currentPeriodTimeseries,
        previousPeriodTimeseries,
      })
    ).toEqual([
      { x: 20, y: 10 },
      { x: 21, y: 11 },
      { x: 22, y: 12 },
      { x: 23, y: 13 },
      { x: 24, y: undefined },
    ]);
  });
});
