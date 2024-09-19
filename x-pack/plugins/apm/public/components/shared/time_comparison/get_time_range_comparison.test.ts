/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getTimeRangeComparison,
  TimeRangeComparisonType,
} from './get_time_range_comparison';

describe('getTimeRangeComparison', () => {
  describe('return empty object', () => {
    it('when comparison is disabled', () => {
      const end = '2021-01-28T15:00:00.000Z';
      const result = getTimeRangeComparison({
        start: undefined,
        end,
        comparisonType: TimeRangeComparisonType.DayBefore,
        comparisonEnabled: false,
      });
      expect(result).toEqual({});
    });
    it('when start is not defined', () => {
      const end = '2021-01-28T15:00:00.000Z';
      const result = getTimeRangeComparison({
        start: undefined,
        end,
        comparisonType: TimeRangeComparisonType.DayBefore,
        comparisonEnabled: true,
      });
      expect(result).toEqual({});
    });

    it('when end is not defined', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const result = getTimeRangeComparison({
        start,
        end: undefined,
        comparisonType: TimeRangeComparisonType.DayBefore,
        comparisonEnabled: true,
      });
      expect(result).toEqual({});
    });
  });

  describe('Time range is between 0 - 24 hours', () => {
    describe('when day before is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const result = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonType.DayBefore,
          comparisonEnabled: true,
          start,
          end,
        });
        expect(result.comparisonStart).toEqual('2021-01-27T14:45:00.000Z');
        expect(result.comparisonEnd).toEqual('2021-01-27T15:00:00.000Z');
        expect(result.offset).toEqual('1d');
      });
    });
    describe('when a week before is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const result = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonType.WeekBefore,
          comparisonEnabled: true,
          start,
          end,
        });
        expect(result.comparisonStart).toEqual('2021-01-21T14:45:00.000Z');
        expect(result.comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
        expect(result.offset).toEqual('1w');
      });
    });
    describe('when previous period is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-02-09T14:40:01.087Z';
        const end = '2021-02-09T14:56:00.000Z';
        const result = getTimeRangeComparison({
          start,
          end,
          comparisonType: TimeRangeComparisonType.PeriodBefore,
          comparisonEnabled: true,
        });
        expect(result).toEqual({
          comparisonStart: '2021-02-09T14:24:02.174Z',
          comparisonEnd: '2021-02-09T14:40:01.087Z',
          offset: '958913ms',
        });
      });
    });
  });

  describe('Time range is between 24 hours - 1 week', () => {
    describe('when a week before is selected', () => {
      it('returns the correct time range - 2 days', () => {
        const start = '2021-01-26T15:00:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const result = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonType.WeekBefore,
          comparisonEnabled: true,
          start,
          end,
        });
        expect(result.comparisonStart).toEqual('2021-01-19T15:00:00.000Z');
        expect(result.comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
        expect(result.offset).toEqual('1w');
      });
    });
  });

  describe('Time range is greater than 7 days', () => {
    it('uses the date difference to calculate the time range - 8 days', () => {
      const start = '2021-01-10T15:00:00.000Z';
      const end = '2021-01-18T15:00:00.000Z';
      const result = getTimeRangeComparison({
        comparisonType: TimeRangeComparisonType.PeriodBefore,
        comparisonEnabled: true,
        start,
        end,
      });
      expect(result.comparisonStart).toEqual('2021-01-02T15:00:00.000Z');
      expect(result.comparisonEnd).toEqual('2021-01-10T15:00:00.000Z');
      expect(result.offset).toEqual('691200000ms');
    });

    it('uses the date difference to calculate the time range - 30 days', () => {
      const start = '2021-01-01T15:00:00.000Z';
      const end = '2021-01-31T15:00:00.000Z';
      const result = getTimeRangeComparison({
        comparisonType: TimeRangeComparisonType.PeriodBefore,
        comparisonEnabled: true,
        start,
        end,
      });
      expect(result.comparisonStart).toEqual('2020-12-02T15:00:00.000Z');
      expect(result.comparisonEnd).toEqual('2021-01-01T15:00:00.000Z');
      expect(result.offset).toEqual('2592000000ms');
    });
  });
});
