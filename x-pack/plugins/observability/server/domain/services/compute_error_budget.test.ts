/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from '../../services/slo/fixtures/slo';
import { computeErrorBudget } from './compute_error_budget';

describe('computeErrorBudget', () => {
  it("returns default values when total events is '0'", () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 0 });

    expect(errorBudget).toEqual({
      initial: 0.001, // 0.1%
      consumed: 0, // 0% consumed
      remaining: 1, // 100% remaining
    });
  });

  it("computes the error budget when 'good > total' events", () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 9999, total: 9 });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
    });
  });

  it('computes the error budget with all good events', () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 100, total: 100 });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 0,
      remaining: 1,
    });
  });

  it('computes the error budget when exactly consumed', () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 999, total: 1000 });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1,
      remaining: 0,
    });
  });

  it('computes the error budget with rounded values', () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 333, total: 777 });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 571.428571, // i.e. 57142% consumed
      remaining: 0,
    });
  });

  it('computes the error budget with no good events', () => {
    const slo = createSLO();
    const errorBudget = computeErrorBudget(slo, { good: 0, total: 100 });

    expect(errorBudget).toEqual({
      initial: 0.001,
      consumed: 1000, // i.e. 100000% consumed
      remaining: 0,
    });
  });
});
