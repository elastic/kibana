/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Coordinate } from '../../typings/timeseries';
import { offsetPreviousPeriodCoordinates } from './offset_previous_period_coordinate';

const currentPeriodTimeseries: Coordinate[] = [
  { x: new Date('2021-01-28T14:45:00.000Z').valueOf(), y: 0 },
];

describe('mergePeriodsTimeseries', () => {
  describe('returns empty array', () => {
    it('when previous timeseries is not defined', () => {
      expect(
        offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries,
          previousPeriodTimeseries: undefined,
        })
      ).toEqual([]);
    });

    it('when previous timeseries is empty', () => {
      expect(
        offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries,
          previousPeriodTimeseries: [],
        })
      ).toEqual([]);
    });
  });

  it('offsets previous period timeseries', () => {
    const previousPeriodTimeseries: Coordinate[] = [
      { x: new Date('2021-01-27T14:45:00.000Z').valueOf(), y: 1 },
      { x: new Date('2021-01-27T15:00:00.000Z').valueOf(), y: 2 },
      { x: new Date('2021-01-27T15:15:00.000Z').valueOf(), y: 2 },
      { x: new Date('2021-01-27T15:30:00.000Z').valueOf(), y: 3 },
    ];

    expect(
      offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries,
        previousPeriodTimeseries,
      })
    ).toEqual([
      { x: new Date('2021-01-28T14:45:00.000Z').valueOf(), y: 1 },
      { x: new Date('2021-01-28T15:00:00.000Z').valueOf(), y: 2 },
      { x: new Date('2021-01-28T15:15:00.000Z').valueOf(), y: 2 },
      { x: new Date('2021-01-28T15:30:00.000Z').valueOf(), y: 3 },
    ]);
  });
});
