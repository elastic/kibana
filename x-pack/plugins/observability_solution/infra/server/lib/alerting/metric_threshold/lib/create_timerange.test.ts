/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Aggregators } from '../../../../../common/alerting/metrics';
import { createTimerange } from './create_timerange';

describe('createTimerange(interval, aggType, timeframe)', () => {
  describe('with current timeframe', () => {
    const end = moment();
    const timeframe = {
      start: end.clone().toISOString(),
      end: end.toISOString(),
    };
    describe('Basic Metric Aggs', () => {
      it('should return a second range for last 1 second', () => {
        const subject = createTimerange(1000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(1000);
      });
      it('should return a minute range for last 1 minute', () => {
        const subject = createTimerange(60000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(60000);
      });
      it('should return 5 minute range for last 5 minutes', () => {
        const subject = createTimerange(300000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(300000);
      });
      it('should return a hour range for last 1 hour', () => {
        const subject = createTimerange(3600000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(3600000);
      });
      it('should return a day range for last 1 day', () => {
        const subject = createTimerange(86400000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(86400000);
      });
    });
    describe('Rate Aggs', () => {
      it('should return a 20 second range for last 1 second', () => {
        const subject = createTimerange(1000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(1000 * 2);
      });
      it('should return a 5 minute range for last 1 minute', () => {
        const subject = createTimerange(60000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(60000 * 2);
      });
      it('should return 25 minute range for last 5 minutes', () => {
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(300000 * 2);
      });
      it('should return 5 hour range for last hour', () => {
        const subject = createTimerange(3600000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(3600000 * 2);
      });
      it('should return a 5 day range for last day', () => {
        const subject = createTimerange(86400000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(86400000 * 2);
      });
    });
  });
  describe('with full timeframe', () => {
    describe('Basic Metric Aggs', () => {
      it('should return 9 minute range when given 4 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(4, 'minutes').toISOString(),
          end: end.toISOString(),
        };
        const subject = createTimerange(300000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(540000);
      });
      it('should return 11 minute range when given 6 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(6, 'minutes').toISOString(),
          end: end.toISOString(),
        };
        const subject = createTimerange(300000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(660000);
      });
    });
    describe('Rate Aggs', () => {
      it('should return 14 minute range when given 4 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(4, 'minutes').toISOString(),
          end: end.toISOString(),
        };
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(840000);
      });
      it('should return 16 minute range when given 6 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(6, 'minutes').toISOString(),
          end: end.toISOString(),
        };
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(960000);
      });
    });
  });
  describe('With lastPeriodEnd', () => {
    const end = moment();
    const timeframe = {
      start: end.clone().toISOString(),
      end: end.toISOString(),
    };
    it('should return a minute and 1 second range for last 1 second when the lastPeriodEnd is less than the timeframe start', () => {
      const subject = createTimerange(
        1000,
        Aggregators.COUNT,
        timeframe,
        end.clone().subtract(1, 'minutes').valueOf()
      );
      expect(subject.end - subject.start).toEqual(61000);
    });
    it('should return a second range for last 1 second when the lastPeriodEnd is not less than the timeframe start', () => {
      const subject = createTimerange(
        1000,
        Aggregators.COUNT,
        timeframe,
        end.clone().add(2, 'seconds').valueOf()
      );
      expect(subject.end - subject.start).toEqual(1000);
    });
  });

  describe('Rate Aggs', () => {
    it('should return 10 minute range for last 5 minutes', () => {
      const end = moment();
      const timeframe = {
        start: end.clone().toISOString(),
        end: end.toISOString(),
      };
      const subject = createTimerange(300000, Aggregators.RATE, timeframe);
      expect(subject).toEqual({
        start: end
          .clone()
          .subtract(300 * 2, 'seconds')
          .valueOf(),
        end: end.valueOf(),
      });
    });
  });
});
