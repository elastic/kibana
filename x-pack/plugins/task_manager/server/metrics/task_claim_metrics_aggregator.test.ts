/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { none } from 'fp-ts/lib/Option';
import { FillPoolResult } from '../lib/fill_pool';
import { asOk, asErr } from '../lib/result_type';
import { PollingError, PollingErrorType } from '../polling';
import { asTaskPollingCycleEvent } from '../task_events';
import { TaskClaimMetricsAggregator } from './task_claim_metrics_aggregator';

export const taskClaimSuccessEvent = asTaskPollingCycleEvent<string>(
  asOk({
    result: FillPoolResult.PoolFilled,
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
    },
  }),
  {
    start: 1689698780490,
    stop: 1689698780500,
  }
);
export const taskClaimFailureEvent = asTaskPollingCycleEvent<string>(
  asErr(
    new PollingError<string>(
      'Failed to poll for work: Error: failed to work',
      PollingErrorType.WorkError,
      none
    )
  )
);

describe('TaskClaimMetricsAggregator', () => {
  let taskClaimMetricsAggregator: TaskClaimMetricsAggregator;
  beforeEach(() => {
    taskClaimMetricsAggregator = new TaskClaimMetricsAggregator();
  });

  test('should correctly initialize', () => {
    expect(taskClaimMetricsAggregator.collect()).toEqual({
      success: 0,
      total: 0,
      duration: { counts: [], values: [] },
      duration_values: [],
    });
  });

  test('should correctly return initialMetrics', () => {
    expect(taskClaimMetricsAggregator.initialMetric()).toEqual({
      success: 0,
      total: 0,
      duration: { counts: [], values: [] },
      duration_values: [],
    });
  });

  test('should correctly process task lifecycle success event', () => {
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    expect(taskClaimMetricsAggregator.collect()).toEqual({
      success: 2,
      total: 2,
      duration: { counts: [2], values: [100] },
      duration_values: [10, 10],
    });
  });

  test('should correctly process task lifecycle failure event', () => {
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimFailureEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimFailureEvent);
    expect(taskClaimMetricsAggregator.collect()).toEqual({
      success: 0,
      total: 2,
      duration: { counts: [], values: [] },
      duration_values: [],
    });
  });

  test('should correctly reset counter', () => {
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimFailureEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimFailureEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimSuccessEvent);
    taskClaimMetricsAggregator.processTaskLifecycleEvent(taskClaimFailureEvent);
    expect(taskClaimMetricsAggregator.collect()).toEqual({
      success: 4,
      total: 7,
      duration: { counts: [4], values: [100] },
      duration_values: [10, 10, 10, 10],
    });

    taskClaimMetricsAggregator.reset();
    expect(taskClaimMetricsAggregator.collect()).toEqual({
      success: 0,
      total: 0,
      duration: { counts: [], values: [] },
      duration_values: [],
    });
  });
});
