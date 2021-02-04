/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeRangeComparison } from './get_time_range_comparison';

describe('getTimeRangeComparison', () => {
  describe('return empty object', () => {
    it('when required fields are not defined', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      let timeRange = getTimeRangeComparison({
        start,
        end,
        comparisonType: 'yesterday',
      });
      expect(timeRange).toEqual({});

      timeRange = getTimeRangeComparison({
        start,
        end,
        comparisonType: undefined,
      });
      expect(timeRange).toEqual({});

      timeRange = getTimeRangeComparison({
        start: undefined,
        end,
        comparisonType: 'yesterday',
      });
      expect(timeRange).toEqual({});
      timeRange = getTimeRangeComparison({
        start,
        end: undefined,
        comparisonType: 'yesterday',
      });
      expect(timeRange).toEqual({});
    });

    it('when invalid type is provided', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const timeRange = getTimeRangeComparison({
        comparisonType: 'foo',
        start,
        end,
      });
      expect(timeRange).toEqual({});
    });
  });

  describe('Time range is between 0 - 24 hours', () => {
    describe('when yesterday is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: 'yesterday',
          start,
          end,
        });
        expect(comparisonStart).toEqual('2021-01-27T14:45:00.000Z');
        expect(comparisonEnd).toEqual('2021-01-27T15:00:00.000Z');
      });
    });
    describe('when a week ago is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: 'week',
          start,
          end,
        });
        expect(comparisonStart).toEqual('2021-01-21T14:45:00.000Z');
        expect(comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
      });
    });
  });

  describe('Time range is between 24 hours - 1 week', () => {
    describe('when a week ago is selected', () => {
      it('returns the correct time range - 2 days', () => {
        const start = '2021-01-26T15:00:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: 'week',
          start,
          end,
        });
        expect(comparisonStart).toEqual('2021-01-19T15:00:00.000Z');
        expect(comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
      });
    });
  });

  describe('Time range is greater than 7 days', () => {
    it('uses the date difference to calculate the time range - 8 days', () => {
      const start = '2021-01-10T15:00:00.000Z';
      const end = '2021-01-18T15:00:00.000Z';
      const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
        comparisonType: 'previousPeriod',
        start,
        end,
      });
      expect(comparisonStart).toEqual('2021-01-02T15:00:00.000Z');
      expect(comparisonEnd).toEqual('2021-01-10T15:00:00.000Z');
    });

    it('uses the date difference to calculate the time range - 30 days', () => {
      const start = '2021-01-01T15:00:00.000Z';
      const end = '2021-01-31T15:00:00.000Z';
      const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
        comparisonType: 'previousPeriod',
        start,
        end,
      });
      expect(comparisonStart).toEqual('2020-12-02T15:00:00.000Z');
      expect(comparisonEnd).toEqual('2021-01-01T15:00:00.000Z');
    });
  });
});
