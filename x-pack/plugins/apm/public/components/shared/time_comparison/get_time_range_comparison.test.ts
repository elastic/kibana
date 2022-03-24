/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { getTimeRangeComparison } from './get_time_range_comparison';

describe('getTimeRangeComparison', () => {
  describe('return empty object', () => {
    it('when comparison is disabled', () => {
      const end = '2021-01-28T15:00:00.000Z';
      const result = getTimeRangeComparison({
        start: undefined,
        end,
        comparisonType: TimeRangeComparisonEnum.DayBefore,
        comparisonEnabled: false,
      });
      expect(result).toEqual({});
    });
    it('when start is not defined', () => {
      const end = '2021-01-28T15:00:00.000Z';
      const result = getTimeRangeComparison({
        start: undefined,
        end,
        comparisonType: TimeRangeComparisonEnum.DayBefore,
        comparisonEnabled: true,
      });
      expect(result).toEqual({});
    });

    it('when end is not defined', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const result = getTimeRangeComparison({
        start,
        end: undefined,
        comparisonType: TimeRangeComparisonEnum.DayBefore,
        comparisonEnabled: true,
      });
      expect(result).toEqual({});
    });
  });
});
