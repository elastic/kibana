/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';
import {
  asRelativeDateTimeRange,
  asAbsoluteDateTime,
  getDateDifference
} from '../datetime';

describe('date time formatters', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Amsterdam');
  });
  afterAll(() => moment.tz.setDefault(''));
  describe('asRelativeDateTimeRange', () => {
    const formatDateToTimezone = (dateTimeString: string) =>
      moment(dateTimeString).valueOf();
    describe('YYYY - YYYY', () => {
      it('range: 10 years', () => {
        const start = formatDateToTimezone('2000-01-01 10:01:01');
        const end = formatDateToTimezone('2010-01-01 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('2000 - 2010');
      });
      it('range: 5 years', () => {
        const start = formatDateToTimezone('2010-01-01 10:01:01');
        const end = formatDateToTimezone('2015-01-01 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('2010 - 2015');
      });
    });
    describe('MMM YYYY - MMM YYYY', () => {
      it('range: 4 years ', () => {
        const start = formatDateToTimezone('2010-01-01 10:01:01');
        const end = formatDateToTimezone('2014-04-01 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Jan 2010 - Apr 2014');
      });
      it('range: 6 months ', () => {
        const start = formatDateToTimezone('2019-01-01 10:01:01');
        const end = formatDateToTimezone('2019-07-01 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Jan 2019 - Jul 2019');
      });
    });
    describe('MMM D, YYYY - MMM D, YYYY', () => {
      it('range: 2 days', () => {
        const start = formatDateToTimezone('2019-10-01 10:01:01');
        const end = formatDateToTimezone('2019-10-05 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 1, 2019 - Oct 5, 2019');
      });
      it('range: 1 day', () => {
        const start = formatDateToTimezone('2019-10-01 10:01:01');
        const end = formatDateToTimezone('2019-10-03 10:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 1, 2019 - Oct 3, 2019');
      });
    });
    describe('MMM D, YYYY, HH:mm - HH:mm (UTC)', () => {
      it('range: 9 hours', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01');
        const end = formatDateToTimezone('2019-10-29 19:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 29, 2019, 10:01 - 19:01 (UTC+1)');
      });
      it('range: 5 hours', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01');
        const end = formatDateToTimezone('2019-10-29 15:01:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 29, 2019, 10:01 - 15:01 (UTC+1)');
      });
    });
    describe('MMM D, YYYY, HH:mm:ss - HH:mm:ss (UTC)', () => {
      it('range: 14 minutes', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01');
        const end = formatDateToTimezone('2019-10-29 10:15:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 29, 2019, 10:01:01 - 10:15:01 (UTC+1)');
      });
      it('range: 5 minutes', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01');
        const end = formatDateToTimezone('2019-10-29 10:06:01');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual('Oct 29, 2019, 10:01:01 - 10:06:01 (UTC+1)');
      });
    });
    describe('MMM D, YYYY, HH:mm:ss.SSS - HH:mm:ss.SSS (UTC)', () => {
      it('range: 9 seconds', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01.001');
        const end = formatDateToTimezone('2019-10-29 10:01:10.002');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual(
          'Oct 29, 2019, 10:01:01.001 - 10:01:10.002 (UTC+1)'
        );
      });
      it('range: 1 second', () => {
        const start = formatDateToTimezone('2019-10-29 10:01:01.001');
        const end = formatDateToTimezone('2019-10-29 10:01:02.002');
        const dateRange = asRelativeDateTimeRange(start, end);
        expect(dateRange).toEqual(
          'Oct 29, 2019, 10:01:01.001 - 10:01:02.002 (UTC+1)'
        );
      });
    });
  });

  describe('asAbsoluteDateTime', () => {
    afterAll(() => moment.tz.setDefault(''));

    it('should add a leading plus for timezones with positive UTC offset', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe(
        'Jun 1, 2019, 14:00 (UTC+2)'
      );
    });

    it('should add a leading minus for timezones with negative UTC offset', () => {
      moment.tz.setDefault('America/Los_Angeles');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe(
        'Jun 1, 2019, 05:00 (UTC-7)'
      );
    });

    it('should use default UTC offset formatting when offset contains minutes', () => {
      moment.tz.setDefault('Canada/Newfoundland');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe(
        'Jun 1, 2019, 09:30 (UTC-02:30)'
      );
    });

    it('should respect DST', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      const timeWithDST = 1559390400000; //  Jun 1, 2019
      const timeWithoutDST = 1575201600000; //  Dec 1, 2019

      expect(asAbsoluteDateTime(timeWithDST)).toBe(
        'Jun 1, 2019, 14:00:00.000 (UTC+2)'
      );

      expect(asAbsoluteDateTime(timeWithoutDST)).toBe(
        'Dec 1, 2019, 13:00:00.000 (UTC+1)'
      );
    });
  });
  describe('getDateDifference', () => {
    it('milliseconds', () => {
      const start = moment('2019-10-29 08:00:00.001');
      const end = moment('2019-10-29 08:00:00.005');
      expect(getDateDifference(start, end, 'milliseconds')).toEqual(4);
    });
    it('seconds', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 08:00:10');
      expect(getDateDifference(start, end, 'seconds')).toEqual(10);
    });
    it('minutes', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 08:15:00');
      expect(getDateDifference(start, end, 'minutes')).toEqual(15);
    });
    it('hours', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 10:00:00');
      expect(getDateDifference(start, end, 'hours')).toEqual(2);
    });
    it('days', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-30 10:00:00');
      expect(getDateDifference(start, end, 'days')).toEqual(1);
    });
    it('months', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-12-29 08:00:00');
      expect(getDateDifference(start, end, 'months')).toEqual(2);
    });
    it('years', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2020-10-29 08:00:00');
      expect(getDateDifference(start, end, 'years')).toEqual(1);
    });
  });
});
