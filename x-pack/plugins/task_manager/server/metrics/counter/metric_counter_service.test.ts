/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCounterService } from './metric_counter_service';

describe('MetricCounterService', () => {
  test('should correctly initialize', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    expect(counterService.collect()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly initialize without initial keys', () => {
    const counterService = new MetricCounterService([]);
    expect(counterService.collect()).toEqual({});
  });

  test('should correctly initialize with flattened initial keys', () => {
    const counterService = new MetricCounterService([
      'overall.success',
      'overall.total',
      'duration',
    ]);
    expect(counterService.collect()).toEqual({ duration: 0, overall: { success: 0, total: 0 } });
  });

  test('should correctly return initialMetrics', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    expect(counterService.initialMetrics()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly increment counter', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    counterService.increment('success');
    counterService.increment('success');
    expect(counterService.collect()).toEqual({ success: 2, total: 0 });
  });

  test('should correctly increment counter for unknown key', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    counterService.increment('success');
    counterService.increment('foo');
    expect(counterService.collect()).toEqual({ foo: 1, success: 1, total: 0 });
  });

  test('should correctly reset counter', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    counterService.increment('success');
    counterService.increment('foo');
    counterService.increment('total');
    counterService.increment('success');
    counterService.increment('success');
    counterService.increment('total');
    counterService.increment('total');
    counterService.increment('total');
    expect(counterService.collect()).toEqual({ foo: 1, success: 3, total: 4 });

    counterService.reset();
    expect(counterService.collect()).toEqual({ foo: 0, success: 0, total: 0 });
  });
});
