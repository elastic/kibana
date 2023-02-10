/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeWindow } from '../models/time_window';
import { Duration } from '../models';
import { toDateRange } from './date_range';
import {
  oneMonth,
  oneQuarter,
  oneWeek,
  thirtyDays,
  twoWeeks,
} from '../../services/slo/fixtures/duration';

const NOW = new Date('2022-08-11T08:31:00.000Z');

describe('toDateRange', () => {
  describe('for calendar aligned time window', () => {
    it('throws when start_time is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const timeWindow = aCalendarTimeWindow(oneWeek(), futureDate);
      expect(() => toDateRange(timeWindow, NOW)).toThrow(
        'Cannot compute date range with future starting time'
      );
    });

    describe("with 'weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        const timeWindow = aCalendarTimeWindow(oneWeek(), new Date('2022-08-11T08:30:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-11T08:30:00.000Z'),
          to: new Date('2022-08-18T08:30:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(oneWeek(), new Date('2022-07-05T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-09T08:00:00.000Z'),
          to: new Date('2022-08-16T08:00:00.000Z'),
        });
      });
    });

    describe("with 'bi-weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        const timeWindow = aCalendarTimeWindow(twoWeeks(), new Date('2022-08-11T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-11T08:00:00.000Z'),
          to: new Date('2022-08-25T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(twoWeeks(), new Date('2022-07-05T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-02T08:00:00.000Z'),
          to: new Date('2022-08-16T08:00:00.000Z'),
        });
      });
    });

    describe("with 'monthly' duration", () => {
      it('computes the date range when starting the same month', () => {
        const timeWindow = aCalendarTimeWindow(oneMonth(), new Date('2022-08-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        const timeWindow = aCalendarTimeWindow(oneMonth(), new Date('2022-07-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-08-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });
    });

    describe("with 'quarterly' duration", () => {
      it('computes the date range when starting the same quarter', () => {
        const timeWindow = aCalendarTimeWindow(oneQuarter(), new Date('2022-07-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-07-01T08:00:00.000Z'),
          to: new Date('2022-10-01T08:00:00.000Z'),
        });
      });

      it('computes the date range when starting a quarter ago', () => {
        const timeWindow = aCalendarTimeWindow(oneQuarter(), new Date('2022-03-01T08:00:00.000Z'));
        expect(toDateRange(timeWindow, NOW)).toEqual({
          from: new Date('2022-06-01T08:00:00.000Z'),
          to: new Date('2022-09-01T08:00:00.000Z'),
        });
      });
    });
  });

  describe('for rolling time window', () => {
    it("computes the date range using a '30days' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(thirtyDays()), NOW)).toEqual({
        from: new Date('2022-07-12T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'weekly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(oneWeek()), NOW)).toEqual({
        from: new Date('2022-08-04T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'monthly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(oneMonth()), NOW)).toEqual({
        from: new Date('2022-07-11T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a 'quarterly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(oneQuarter()), NOW)).toEqual({
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
