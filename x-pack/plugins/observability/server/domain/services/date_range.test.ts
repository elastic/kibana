/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeWindow } from '../models/time_window';
import { Duration, DurationUnit } from '../models';
import { toDateRange } from './date_range';

const THIRTY_DAYS = new Duration(30, DurationUnit.Day);
const WEEKLY = new Duration(1, DurationUnit.Week);
const BIWEEKLY = new Duration(2, DurationUnit.Week);
const MONTHLY = new Duration(1, DurationUnit.Month);
const QUARTERLY = new Duration(1, DurationUnit.Quarter);

const NOW = new Date('2022-08-11T08:31:00.000Z');

describe('toDateRange', () => {
  describe('for calendar aligned time window', () => {
    it('throws when start_time is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const timeWindow = aCalendarTimeWindow(WEEKLY, futureDate);
      expect(() => toDateRange(timeWindow, NOW)).toThrow(
        'Cannot compute date range with future starting time'
      );
    });

    describe("with 'weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        const timeWindow = aCalendarTimeWindow(WEEKLY, new Date('2022-08-11T08:30:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-11T08:30:00.000Z'),
          to: new Date('2022-08-18T08:30:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(WEEKLY, new Date('2022-07-05T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-09T08:00:00.000Z'),
          to: new Date('2022-08-16T08:00:00.000Z'),
        });
      });
    });

    describe("with 'bi-weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        const timeWindow = aCalendarTimeWindow(BIWEEKLY, new Date('2022-08-11T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-11T08:00:00.000Z'),
          to: new Date('2022-08-25T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(BIWEEKLY, new Date('2022-07-05T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-09T08:00:00.000Z'),
          to: new Date('2022-08-23T08:00:00.000Z'),
        });
      });
    });

    describe("with 'monthly' duration", () => {
      it('computes the date range when starting the same month', () => {
        const timeWindow = aCalendarTimeWindow(MONTHLY, new Date('2022-08-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(MONTHLY, new Date('2022-07-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });
    });

    describe("with 'quarterly' duration", () => {
      it('computes the date range when starting the same quarter', () => {
        const timeWindow = aCalendarTimeWindow(QUARTERLY, new Date('2022-07-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-07-01T08:00:00.000Z'),
          to: new Date('2022-10-01T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a quarter ago', () => {
        const timeWindow = aCalendarTimeWindow(QUARTERLY, new Date('2022-03-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-06-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });
    });
  });

  describe('for rolling time window', () => {
    it("computes the date range using a '30days' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(THIRTY_DAYS), NOW)).toEqual({
        from: new Date('2022-07-12T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'weekly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(WEEKLY), NOW)).toEqual({
        from: new Date('2022-08-04T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'monthly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(MONTHLY), NOW)).toEqual({
        from: new Date('2022-07-11T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'quarterly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(QUARTERLY), NOW)).toEqual({
        from: new Date('2022-05-11T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });
  });
});

function aCalendarTimeWindow(duration: Duration, startTime: Date): TimeWindow {
  return {
    duration,
    calendar: { startTime },
  };
}

function aRollingTimeWindow(duration: Duration): TimeWindow {
  return { duration, isRolling: true };
}
