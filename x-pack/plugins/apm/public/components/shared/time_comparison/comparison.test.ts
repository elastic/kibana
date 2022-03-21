/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { getTimeRangeComparison } from './get_time_range_comparison';
import { getDateRange } from '../../../context/url_params_context/helpers';
import { getComparisonOptions } from './get_comparison_options';
import moment from 'moment-timezone';

function getExpectedTimesAndComparisons({
  rangeFrom,
  rangeTo,
}: {
  rangeFrom: string;
  rangeTo: string;
}) {
  const { start, end } = getDateRange({ rangeFrom, rangeTo });
  const comparisonOptions = getComparisonOptions({ start, end });

  const comparisons = comparisonOptions.map(({ value, text }) => {
    const { comparisonStart, comparisonEnd, offset } = getTimeRangeComparison({
      comparisonEnabled: true,
      comparisonType: value,
      start,
      end,
    });

    return {
      value,
      text,
      comparisonStart,
      comparisonEnd,
      offset,
    };
  });

  return {
    start,
    end,
    comparisons,
  };
}

describe('Comparison test suite', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    moment.tz.setDefault('Europe/London');
    const mockDateNow = '2022-01-14T18:30:15.500Z';
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date(mockDateNow).getTime());
  });

  afterAll(() => {
    moment.tz.setDefault('');
    dateNowSpy.mockRestore();
  });

  describe('When the time difference is less than 25 hours', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: '2022-01-15T18:00:00.000Z',
        rangeTo: '2022-01-16T18:30:00.000Z',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-15T18:00:00.000Z');
      expect(expectation.end).toBe('2022-01-16T18:30:00.000Z');
    });

    it('should return comparison by day and week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.DayBefore,
          text: 'Day before',
          comparisonStart: '2022-01-14T18:00:00.000Z',
          comparisonEnd: '2022-01-15T18:30:00.000Z',
          offset: '1d',
        },
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-08T18:00:00.000Z',
          comparisonEnd: '2022-01-09T18:30:00.000Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When the time difference is more than 25 hours', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: '2022-01-15T18:00:00.000Z',
        rangeTo: '2022-01-16T19:00:00.000Z',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-15T18:00:00.000Z');
      expect(expectation.end).toBe('2022-01-16T19:00:00.000Z');
    });

    it('should only return comparison by week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-08T18:00:00.000Z',
          comparisonEnd: '2022-01-09T19:00:00.000Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When the time difference is more than 25 hours and less than 8 days', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: '2022-01-15T18:00:00.000Z',
        rangeTo: '2022-01-22T21:00:00.000Z',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-15T18:00:00.000Z');
      expect(expectation.end).toBe('2022-01-22T21:00:00.000Z');
    });

    it('should only return comparison by week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-08T18:00:00.000Z',
          comparisonEnd: '2022-01-15T21:00:00.000Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When the time difference is 8 days', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: '2022-01-15T18:00:00.000Z',
        rangeTo: '2022-01-23T18:00:00.000Z',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-15T18:00:00.000Z');
      expect(expectation.end).toBe('2022-01-23T18:00:00.000Z');
    });

    it('should only return comparison by period and format text as DD/MM HH:mm when range years are the same', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.PeriodBefore,
          text: '07/01 18:00 - 15/01 18:00',
          comparisonStart: '2022-01-07T18:00:00.000Z',
          comparisonEnd: '2022-01-15T18:00:00.000Z',
          offset: '691200000ms',
        },
      ]);
    });

    it('should have the same offset for start / end and comparisonStart / comparisonEnd', () => {
      const { start, end, comparisons } = expectation;
      const diffInMs = moment(end).diff(moment(start));
      expect(`${diffInMs}ms`).toBe(comparisons[0].offset);
    });
  });

  describe('When the time difference is more than 8 days', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: '2022-01-15T18:00:00.000Z||/d',
        rangeTo: '2022-01-23T18:00:00.000Z',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-15T00:00:00.000Z');
      expect(expectation.end).toBe('2022-01-23T18:00:00.000Z');
    });

    it('should only return comparison by period and format text as DD/MM HH:mm when range years are the same', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.PeriodBefore,
          text: '06/01 06:00 - 15/01 00:00',
          comparisonStart: '2022-01-06T06:00:00.000Z',
          comparisonEnd: '2022-01-15T00:00:00.000Z',
          offset: '756000000ms',
        },
      ]);
    });

    it('should have the same offset for start / end and comparisonStart / comparisonEnd', () => {
      const { start, end, comparisons } = expectation;
      const diffInMs = moment(end).diff(moment(start));
      expect(`${diffInMs}ms`).toBe(comparisons[0].offset);
    });
  });

  describe('When "Today" is selected', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now/d',
        rangeTo: 'now/d',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-14T00:00:00.000Z');
      expect(expectation.end).toBe('2022-01-14T23:59:59.999Z');
    });

    it('should return comparison by day and week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.DayBefore,
          text: 'Day before',
          comparisonStart: '2022-01-13T00:00:00.000Z',
          comparisonEnd: '2022-01-13T23:59:59.999Z',
          offset: '1d',
        },
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-07T00:00:00.000Z',
          comparisonEnd: '2022-01-07T23:59:59.999Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "This week" is selected', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now/w',
        rangeTo: 'now/w',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-09T00:00:00.000Z');
      expect(expectation.end).toBe('2022-01-15T23:59:59.999Z');
    });

    it('should only return comparison by week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-02T00:00:00.000Z',
          comparisonEnd: '2022-01-08T23:59:59.999Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "Last 24 hours" is selected with no rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-13T18:30:15.500Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should return comparison by day and week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.DayBefore,
          text: 'Day before',
          comparisonStart: '2022-01-12T18:30:15.500Z',
          comparisonEnd: '2022-01-13T18:30:15.500Z',
          offset: '1d',
        },
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-06T18:30:15.500Z',
          comparisonEnd: '2022-01-07T18:30:15.500Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "Last 24 hours" is selected with rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-24h/h',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-13T18:00:00.000Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should return comparison by day and week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.DayBefore,
          text: 'Day before',
          comparisonStart: '2022-01-12T18:00:00.000Z',
          comparisonEnd: '2022-01-13T18:30:15.500Z',
          offset: '1d',
        },
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2022-01-06T18:00:00.000Z',
          comparisonEnd: '2022-01-07T18:30:15.500Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "Last 7 days" is selected with no rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-7d',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-07T18:30:15.500Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should only return comparison by week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2021-12-31T18:30:15.500Z',
          comparisonEnd: '2022-01-07T18:30:15.500Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "Last 7 days" is selected with rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-7d/d',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2022-01-07T00:00:00.000Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should only return comparison by week', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.WeekBefore,
          text: 'Week before',
          comparisonStart: '2021-12-31T00:00:00.000Z',
          comparisonEnd: '2022-01-07T18:30:15.500Z',
          offset: '1w',
        },
      ]);
    });
  });

  describe('When "Last 30 days" is selected with no rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-30d',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2021-12-15T18:30:15.500Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should only return comparison by period and format text as DD/MM/YY HH:mm when range years are different', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.PeriodBefore,
          text: '15/11/21 18:30 - 15/12/21 18:30',
          comparisonStart: '2021-11-15T18:30:15.500Z',
          comparisonEnd: '2021-12-15T18:30:15.500Z',
          offset: '2592000000ms',
        },
      ]);
    });

    it('should have the same offset for start / end and comparisonStart / comparisonEnd', () => {
      const { start, end, comparisons } = expectation;
      const diffInMs = moment(end).diff(moment(start));
      expect(`${diffInMs}ms`).toBe(comparisons[0].offset);
    });
  });

  describe('When "Last 30 days" is selected with rounding', () => {
    let expectation: ReturnType<typeof getExpectedTimesAndComparisons>;

    beforeAll(() => {
      expectation = getExpectedTimesAndComparisons({
        rangeFrom: 'now-30d/d',
        rangeTo: 'now',
      });
    });

    it('should return the correct start and end date', () => {
      expect(expectation.start).toBe('2021-12-15T00:00:00.000Z');
      expect(expectation.end).toBe('2022-01-14T18:30:15.500Z');
    });

    it('should only return comparison by period and format text as DD/MM/YY HH:mm when range years are different', () => {
      expect(expectation.comparisons).toEqual([
        {
          value: TimeRangeComparisonEnum.PeriodBefore,
          text: '14/11/21 05:29 - 15/12/21 00:00',
          comparisonStart: '2021-11-14T05:29:44.500Z',
          comparisonEnd: '2021-12-15T00:00:00.000Z',
          offset: '2658615500ms',
        },
      ]);
    });

    it('should have the same offset for start / end and comparisonStart / comparisonEnd', () => {
      const { start, end, comparisons } = expectation;
      const diffInMs = moment(end).diff(moment(start));
      expect(`${diffInMs}ms`).toBe(comparisons[0].offset);
    });
  });
});
