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
  describe('without timeframe', () => {
    describe('Basic Metric Aggs', () => {
      it('should return a second range for last 1 second', () => {
        const subject = createTimerange(1000, Aggregators.COUNT);
        expect(subject.end - subject.start).toEqual(1000);
      });
      it('should return a minute range for last 1 minute', () => {
        const subject = createTimerange(60000, Aggregators.COUNT);
        expect(subject.end - subject.start).toEqual(60000);
      });
      it('should return 5 minute range for last 5 minutes', () => {
        const subject = createTimerange(300000, Aggregators.COUNT);
        expect(subject.end - subject.start).toEqual(300000);
      });
      it('should return a hour range for last 1 hour', () => {
        const subject = createTimerange(3600000, Aggregators.COUNT);
        expect(subject.end - subject.start).toEqual(3600000);
      });
      it('should return a day range for last 1 day', () => {
        const subject = createTimerange(86400000, Aggregators.COUNT);
        expect(subject.end - subject.start).toEqual(86400000);
      });
    });
    describe('Rate Aggs', () => {
      it('should return a 20 second range for last 1 second', () => {
        const subject = createTimerange(1000, Aggregators.RATE);
        expect(subject.end - subject.start).toEqual(1000 * 5);
      });
      it('should return a 5 minute range for last 1 minute', () => {
        const subject = createTimerange(60000, Aggregators.RATE);
        expect(subject.end - subject.start).toEqual(60000 * 5);
      });
      it('should return 25 minute range for last 5 minutes', () => {
        const subject = createTimerange(300000, Aggregators.RATE);
        expect(subject.end - subject.start).toEqual(300000 * 5);
      });
      it('should return 5 hour range for last hour', () => {
        const subject = createTimerange(3600000, Aggregators.RATE);
        expect(subject.end - subject.start).toEqual(3600000 * 5);
      });
      it('should return a 5 day range for last day', () => {
        const subject = createTimerange(86400000, Aggregators.RATE);
        expect(subject.end - subject.start).toEqual(86400000 * 5);
      });
    });
  });
  describe('with full timeframe', () => {
    describe('Basic Metric Aggs', () => {
      it('should return 5 minute range when given 4 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(4, 'minutes').valueOf(),
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(300000);
      });
      it('should return 6 minute range when given 6 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(6, 'minutes').valueOf(),
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.COUNT, timeframe);
        expect(subject.end - subject.start).toEqual(360000);
      });
    });
    describe('Rate Aggs', () => {
      it('should return 25 minute range when given 4 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(4, 'minutes').valueOf(),
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(300000 * 5);
      });
      it('should return 25 minute range when given 6 minute timeframe', () => {
        const end = moment();
        const timeframe = {
          start: end.clone().subtract(6, 'minutes').valueOf(),
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject.end - subject.start).toEqual(300000 * 5);
      });
    });
  });
  describe('with partial timeframe', () => {
    describe('Basic Metric Aggs', () => {
      it('should return 5 minute range for last 5 minutes', () => {
        const end = moment();
        const timeframe = {
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.AVERAGE, timeframe);
        expect(subject).toEqual({
          start: end.clone().subtract(5, 'minutes').valueOf(),
          end: end.valueOf(),
        });
      });
    });
    describe('Rate Aggs', () => {
      it('should return 25 minute range for last 5 minutes', () => {
        const end = moment();
        const timeframe = {
          end: end.valueOf(),
        };
        const subject = createTimerange(300000, Aggregators.RATE, timeframe);
        expect(subject).toEqual({
          start: end
            .clone()
            .subtract(300 * 5, 'seconds')
            .valueOf(),
          end: end.valueOf(),
        });
      });
    });
  });
});
