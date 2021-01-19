/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useTimeSeriesComparison } from './use_time_comparison';

describe('Time range comparison', () => {
  it('returns empty when time comparision type is not available', () => {
    const start = '2021-01-28T14:45:00.000Z';
    const end = '2021-01-28T15:00:00.000Z';
    const timeComparison = useTimeSeriesComparison({
      start,
      end,
    });
    expect(timeComparison).toBeUndefined();
  });
  describe('Time range is between 0 - 24 hours', () => {
    it('compares the current time range with an identical time range yesterday', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const timeComparison = useTimeSeriesComparison({
        start,
        end,
        timeComparison: 'yesterday',
      });
      expect(timeComparison).toEqual({
        start: '2021-01-27T14:45:00.000Z',
        end: '2021-01-27T15:00:00.000Z',
      });
    });

    it('compares the current time range with an identical time range last week', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const timeComparison = useTimeSeriesComparison({
        start,
        end,
        timeComparison: 'week',
      });
      expect(timeComparison).toEqual({
        start: '2021-01-21T14:45:00.000Z',
        end: '2021-01-21T15:00:00.000Z',
      });
    });
  });

  describe('Time range is between 24 hours - 1 week', () => {
    it('compares the current time range one week ago', () => {
      const start = '2021-01-26T15:00:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const timeComparison = useTimeSeriesComparison({
        start,
        end,
        timeComparison: 'week',
      });
      expect(timeComparison).toEqual({
        start: '2021-01-19T15:00:00.000Z',
        end: '2021-01-21T15:00:00.000Z',
      });
    });
  });
});
