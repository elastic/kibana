/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  monthlyCalendarAligned,
  ninetyDaysRolling,
  sevenDaysRolling,
  thirtyDaysRolling,
  weeklyCalendarAligned,
} from '../../services/fixtures/time_window';
import { toDateRange } from './date_range';

const NOW = new Date('2022-08-11T08:31:00.000Z');

describe('toDateRange', () => {
  describe('for calendar aligned time window', () => {
    it('computes the date range for weekly calendar', () => {
      const timeWindow = weeklyCalendarAligned();
      expect(toDateRange(timeWindow, NOW)).toEqual({
        from: new Date('2022-08-08T00:00:00.000Z'),
        to: new Date('2022-08-14T23:59:59.999Z'),
      });
    });

    it('computes the date range for monthly calendar', () => {
      const timeWindow = monthlyCalendarAligned();
      expect(toDateRange(timeWindow, NOW)).toEqual({
        from: new Date('2022-08-01T00:00:00.000Z'),
        to: new Date('2022-08-31T23:59:59.999Z'),
      });
    });
  });

  describe('for rolling time window', () => {
    it("computes the date range using a '30days' rolling window", () => {
      expect(toDateRange(thirtyDaysRolling(), NOW)).toEqual({
        from: new Date('2022-07-12T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a '7days' rolling window", () => {
      expect(toDateRange(sevenDaysRolling(), NOW)).toEqual({
        from: new Date('2022-08-04T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });

    it("computes the date range using a '90days' rolling window", () => {
      expect(toDateRange(ninetyDaysRolling(), NOW)).toEqual({
        from: new Date('2022-05-13T08:31:00.000Z'),
        to: new Date('2022-08-11T08:31:00.000Z'),
      });
    });
  });
});
