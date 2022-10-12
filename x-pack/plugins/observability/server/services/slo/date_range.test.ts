/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit, TimeWindow } from '../../types/schema';
import { toDateRange } from './date_range';

const THIRTY_DAYS = new Duration(30, DurationUnit.d);
const WEEKLY = new Duration(1, DurationUnit.w);
const BIWEEKLY = new Duration(2, DurationUnit.w);
const MONTHLY = new Duration(1, DurationUnit.M);
const QUARTERLY = new Duration(1, DurationUnit.Q);

const NOW = new Date('2022-10-11T15:42:00.000Z');

const LOS_ANGELES_TZ = 'America/Los_Angeles';
const TALLINN_TZ = 'Europe/Tallinn';

describe('toDateRange', () => {
  describe('for calendar aligned time window', () => {
    describe("with 'weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        expect(
          toDateRange(aCalendarTimeWindow(WEEKLY, '2022-10-11T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-11T15:00:00.000Z'),
          to: new Date('2022-10-18T15:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        expect(
          toDateRange(aCalendarTimeWindow(WEEKLY, '2022-09-05T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-10T15:00:00.000Z'),
          to: new Date('2022-10-17T15:00:00.000Z'),
        });
      });

      it('computes the date range using the provided timezone', () => {
        expect(
          toDateRange(aCalendarTimeWindow(WEEKLY, '2022-09-05T09:00', TALLINN_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-10T06:00:00.000Z'),
          to: new Date('2022-10-17T06:00:00.000Z'),
        });
      });
    });

    describe("With 'bi-weekly' duration", () => {
      it('computes the date range when starting the same day', () => {
        expect(
          toDateRange(aCalendarTimeWindow(BIWEEKLY, '2022-10-11T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-11T15:00:00.000Z'),
          to: new Date('2022-10-25T15:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        expect(
          toDateRange(aCalendarTimeWindow(BIWEEKLY, '2022-09-05T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-10T15:00:00.000Z'),
          to: new Date('2022-10-24T15:00:00.000Z'),
        });
      });

      it('computes the date range using the provided timezone', () => {
        expect(
          toDateRange(aCalendarTimeWindow(BIWEEKLY, '2022-09-05T09:00', TALLINN_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-10T06:00:00.000Z'),
          to: new Date('2022-10-24T06:00:00.000Z'),
        });
      });
    });

    describe("With 'monthly' duration", () => {
      it('computes the date range when starting the same month', () => {
        expect(
          toDateRange(aCalendarTimeWindow(MONTHLY, '2022-10-01T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-01T15:00:00.000Z'),
          to: new Date('2022-11-01T15:00:00.000Z'),
        });
      });

      it('computes the date range when starting a month ago', () => {
        expect(
          toDateRange(aCalendarTimeWindow(MONTHLY, '2022-09-01T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-01T15:00:00.000Z'),
          to: new Date('2022-11-01T15:00:00.000Z'),
        });
      });

      it('computes the date range using the provided timezone', () => {
        expect(
          toDateRange(aCalendarTimeWindow(MONTHLY, '2022-09-05T09:00', TALLINN_TZ), NOW)
        ).toEqual({
          from: new Date('2022-10-05T06:00:00.000Z'),
          to: new Date('2022-11-05T07:00:00.000Z'),
        });
      });
    });

    describe("With 'quarterly' duration", () => {
      it('computes the date range when starting the same quarter', () => {
        expect(
          toDateRange(aCalendarTimeWindow(QUARTERLY, '2022-09-01T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-09-01T15:00:00.000Z'),
          to: new Date('2022-12-01T16:00:00.000Z'),
        });
      });

      it('computes the date range when starting a quarter ago', () => {
        expect(
          toDateRange(aCalendarTimeWindow(QUARTERLY, '2022-06-01T08:00', LOS_ANGELES_TZ), NOW)
        ).toEqual({
          from: new Date('2022-09-01T15:00:00.000Z'),
          to: new Date('2022-12-01T16:00:00.000Z'),
        });
      });

      it('computes the date range using the provided timezone', () => {
        expect(
          toDateRange(aCalendarTimeWindow(QUARTERLY, '2022-06-05T09:00', TALLINN_TZ), NOW)
        ).toEqual({
          from: new Date('2022-09-05T06:00:00.000Z'),
          to: new Date('2022-12-05T07:00:00.000Z'),
        });
      });
    });
  });

  describe('For rolling time window', () => {
    it("computes the date range using a '30days' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(THIRTY_DAYS), NOW)).toEqual({
        from: new Date('2022-09-11T15:42:00.000Z'),
        to: new Date('2022-10-11T15:42:00.000Z'),
      });
    });

    it("computes the date range using a 'weekly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(WEEKLY), NOW)).toEqual({
        from: new Date('2022-10-04T15:42:00.000Z'),
        to: new Date('2022-10-11T15:42:00.000Z'),
      });
    });

    it("computes the date range using a 'monthly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(MONTHLY), NOW)).toEqual({
        from: new Date('2022-09-11T15:42:00.000Z'),
        to: new Date('2022-10-11T15:42:00.000Z'),
      });
    });

    it("computes the date range using a 'quarterly' rolling window", () => {
      expect(toDateRange(aRollingTimeWindow(QUARTERLY), NOW)).toEqual({
        from: new Date('2022-07-11T15:42:00.000Z'),
        to: new Date('2022-10-11T15:42:00.000Z'),
      });
    });
  });
});

function aCalendarTimeWindow(
  duration: Duration,
  startTime: string,
  timeZone: string = LOS_ANGELES_TZ
): TimeWindow {
  return {
    duration,
    calendar: { start_time: startTime, time_zone: timeZone },
  };
}

function aRollingTimeWindow(duration: Duration): TimeWindow {
  return { duration, is_rolling: true };
}
