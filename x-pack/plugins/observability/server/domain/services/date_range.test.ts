/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeWindow } from '../models/time_window';
import { Duration } from '../models';
import { toDateRange } from './date_range';
import { oneMonth, oneQuarter, oneWeek, thirtyDays } from '../../services/slo/fixtures/duration';

const NOW = new Date('2022-08-11T08:31:00.000Z');

describe('toDateRange', () => {
  describe('for calendar aligned time window', () => {
    it('computes the date range for weekly calendar', () => {
      const timeWindow = aCalendarTimeWindow(oneWeek());
      expect(toDateRange(timeWindow, NOW)).toEqual({
        from: new Date('2022-08-07T00:00:00.000Z'),
        to: new Date('2022-08-13T23:59:59.999Z'),
      });
    });

    it('computes the date range for monthly calendar', () => {
      const timeWindow = aCalendarTimeWindow(oneMonth());
      expect(toDateRange(timeWindow, NOW)).toEqual({
        from: new Date('2022-08-01T00:00:00.000Z'),
        to: new Date('2022-08-31T23:59:59.999Z'),
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

function aCalendarTimeWindow(duration: Duration): TimeWindow {
  return {
    duration,
    isCalendar: true,
  };
}

function aRollingTimeWindow(duration: Duration): TimeWindow {
  return { duration, isRolling: true };
}
