/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneMinute } from '../../services/slo/fixtures/duration';
import { createSLO } from '../../services/slo/fixtures/slo';
import { sevenDaysRolling, weeklyCalendarAligned } from '../../services/slo/fixtures/time_window';
import { computeErrorBudget } from './compute_error_budget';
import { toDateRange } from './date_range';

describe('computeErrorBudget', () => {
  describe('for rolling time window', () => {
    describe('for occurrences budgeting method', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgetingMethod: 'occurrences',
          timeWindow: sevenDaysRolling(),
          objective: { target: 0.95 },
        });
        const dateRange = toDateRange(slo.timeWindow);
        const errorBudget = computeErrorBudget(slo, {
          good: 97,
          total: 100,
          dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.6,
          remaining: 0.4,
          isEstimated: false,
        });
      });
    });

    describe('for timeslices budgeting method', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          timeWindow: sevenDaysRolling(),
          objective: { target: 0.95, timesliceTarget: 0.95, timesliceWindow: oneMinute() },
        });
        const dateRange = toDateRange(slo.timeWindow);
        // 7 days sliced in 1m buckets = 10,080 slices
        const errorBudget = computeErrorBudget(slo, {
          good: 9987,
          total: 10080,
          dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.184524,
          remaining: 0.815476,
          isEstimated: false,
        });
      });
    });
  });

  describe('for calendar aligned time window', () => {
    describe('for occurrences budgeting method', () => {
      beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2023-05-09') });
      });

      it('computes the error budget with an estimation of total events', () => {
        const slo = createSLO({
          budgetingMethod: 'occurrences',
          timeWindow: weeklyCalendarAligned(),
          objective: { target: 0.95 },
        });
        const dateRange = toDateRange(slo.timeWindow);
        const errorBudget = computeErrorBudget(slo, {
          good: 97,
          total: 100,
          dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.171429,
          remaining: 0.828571,
          isEstimated: true,
        });
      });
    });

    describe('for timeslices budgeting method', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          timeWindow: weeklyCalendarAligned(),
          objective: { target: 0.95, timesliceTarget: 0.95, timesliceWindow: oneMinute() },
        });
        const dateRange = toDateRange(slo.timeWindow);
        // 2 days sliced in 1m buckets = 2,880 slices (slices we have data for) = total
        // 7 days sliced in 1m buckets = 10,080 slices (all slices for the window) = window_total
        const errorBudget = computeErrorBudget(slo, {
          good: 2823,
          total: 2880,
          dateRange,
        });

        // error rate = (total - good) / window_total = (2880 - 2823) / 10080 = 0.00565476
        // consumed = error rate / error budget = 0.00565476 / 0.05 = 0.1130952
        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.113106,
          remaining: 0.886894,
          isEstimated: false,
        });
      });
    });
  });

  it("returns default values when total events is '0'", () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 0, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001, // 0.1%
      consumed: 0, // 0% consumed
      remaining: 1, // 100% remaining
      isEstimated: false,
    });
  });

  it("returns default values when 'good >= total' events", () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 9999, total: 9, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
      isEstimated: false,
    });
  });

  it('computes the error budget with all good events', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 100, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
      isEstimated: false,
    });
  });

  it('computes the error budget when exactly consumed', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 999, total: 1000, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1,
      remaining: 0,
      isEstimated: false,
    });
  });

  it('computes the error budget with rounded values', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 770, total: 777, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 9.009009, // i.e. 900.90% consumed
      remaining: -8.009009, // i.e. -800.90% remaining
      isEstimated: false,
    });
  });

  it('computes the error budget with no good events', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.timeWindow);
    const errorBudget = computeErrorBudget(slo, { good: 0, total: 100, dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1000, // i.e. 100,000% consumed
      remaining: -999,
      isEstimated: false,
    });
  });
});
