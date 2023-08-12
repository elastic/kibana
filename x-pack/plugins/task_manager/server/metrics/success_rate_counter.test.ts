/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuccessRateCounter } from './success_rate_counter';

describe('SuccessRateCounter', () => {
  let successRateCounter: SuccessRateCounter;
  beforeEach(() => {
    successRateCounter = new SuccessRateCounter();
  });

  test('should correctly initialize', () => {
    expect(successRateCounter.get()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly return initialMetrics', () => {
    expect(successRateCounter.initialMetric()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly increment counter when success is true', () => {
    successRateCounter.increment(true);
    successRateCounter.increment(true);
    expect(successRateCounter.get()).toEqual({ success: 2, total: 2 });
  });

  test('should correctly increment counter when success is false', () => {
    successRateCounter.increment(false);
    successRateCounter.increment(false);
    expect(successRateCounter.get()).toEqual({ success: 0, total: 2 });
  });

  test('should correctly reset counter', () => {
    successRateCounter.increment(true);
    successRateCounter.increment(true);
    successRateCounter.increment(false);
    successRateCounter.increment(false);
    successRateCounter.increment(true);
    successRateCounter.increment(true);
    successRateCounter.increment(false);
    expect(successRateCounter.get()).toEqual({ success: 4, total: 7 });

    successRateCounter.reset();
    expect(successRateCounter.get()).toEqual({ success: 0, total: 0 });
  });
});
