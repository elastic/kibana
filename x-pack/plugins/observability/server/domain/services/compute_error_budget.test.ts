/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { twoDaysAgo } from '../../services/slo/fixtures/date';
import { oneMinute } from '../../services/slo/fixtures/duration';
import { createSLO } from '../../services/slo/fixtures/slo';
import { sevenDaysRolling, weeklyCalendarAligned } from '../../services/slo/fixtures/time_window';
import { computeErrorBudget } from './compute_error_budget';
import { toDateRange } from './date_range';

describe('computeErrorBudget', () => {
  describe('for occurrences based SLO', () => {
    describe('with rolling time window', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgeting_method: 'occurrences',
          time_window: sevenDaysRolling(),
          objective: { target: 0.95 },
        });
        const dateRange = toDateRange(slo.time_window);
        const errorBudget = computeErrorBudget(slo, {
          good: 97,
          total: 100,
          date_range: dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.6,
          remaining: 0.4,
        });
      });
    });

    describe('with calendar aligned time window', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgeting_method: 'occurrences',
          time_window: weeklyCalendarAligned(twoDaysAgo()),
          objective: { target: 0.95 },
        });
        const dateRange = toDateRange(slo.time_window);
        const errorBudget = computeErrorBudget(slo, {
          good: 97,
          total: 100,
          date_range: dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.6,
          remaining: 0.4,
        });
      });
    });
  });

  describe('for timeslices based SLO', () => {
    describe('with rolling time window', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgeting_method: 'timeslices',
          time_window: sevenDaysRolling(),
          objective: { target: 0.95, timeslice_target: 0.95, timeslice_window: oneMinute() },
        });
        const dateRange = toDateRange(slo.time_window);
        // 7 days sliced in 1m buckets = 10,080 slices
        const errorBudget = computeErrorBudget(slo, {
          good: 9987,
          total: 10080,
          date_range: dateRange,
        });

        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.184524,
          remaining: 0.815476,
        });
      });
    });

    describe('with calendar aligned time window', () => {
      it('computes the error budget', () => {
        const slo = createSLO({
          budgeting_method: 'timeslices',
          time_window: weeklyCalendarAligned(twoDaysAgo()),
          objective: { target: 0.95, timeslice_target: 0.95, timeslice_window: oneMinute() },
        });
        const dateRange = toDateRange(slo.time_window);
        // 2 days sliced in 1m buckets = 2,880 slices (slices we have data for) = total
        // 7 days sliced in 1m buckets = 10,080 slices (all slices for the window) = window_total
        const errorBudget = computeErrorBudget(slo, {
          good: 2823,
          total: 2880,
          date_range: dateRange,
        });

        // error rate = (total - good) / window_total = (2880 - 2823) / 10080 = 0.00565476
        // consumed = error rate / error budget = 0.00565476 / 0.05 = 0.1130952
        expect(errorBudget).toEqual({
          initial: 0.05,
          consumed: 0.113095,
          remaining: 0.886905,
        });
      });
    });
  });

  it("returns default values when total events is '0'", () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 0, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001, // 0.1%
      consumed: 0, // 0% consumed
      remaining: 1, // 100% remaining
    });
  });

  it("computes the error budget when 'good > total' events", () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 9999, total: 9, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
    });
  });

  it('computes the error budget with all good events', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 100, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
    });
  });

  it('computes the error budget when exactly consumed', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 999, total: 1000, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1,
      remaining: 0,
    });
  });

  it('computes the error budget with rounded values', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 333, total: 777, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 571.428571, // i.e. 57,142% consumed
      remaining: 0,
    });
  });

  it('computes the error budget with no good events', () => {
    const slo = createSLO();
    const dateRange = toDateRange(slo.time_window);
    const errorBudget = computeErrorBudget(slo, { good: 0, total: 100, date_range: dateRange });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1000, // i.e. 100,000% consumed
      remaining: 0,
    });
  });
});
