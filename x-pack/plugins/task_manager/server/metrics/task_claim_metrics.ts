/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, filter, interval, map, merge, Observable, startWith } from 'rxjs';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { isTaskPollingCycleEvent } from '../task_events';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { SuccessRate } from './metrics_stream';
import { TaskManagerConfig } from '../config';
import { taskLifecycleEventToSuccessMetric } from './utils';

export type TaskClaimMetric = SuccessRate;

export function createTaskClaimMetricsAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  config: TaskManagerConfig,
  resetMetrics$: Observable<boolean>
): AggregatedStatProvider<TaskClaimMetric> {
  const claimSuccessCounter: SuccessRate = { total: 0, success: 0 };

  // Resets the claim counters either when the reset interval has passed or
  // a resetMetrics$ event is received
  merge(
    interval(config.metrics_reset_interval).pipe(map(() => true)),
    resetMetrics$.pipe(map(() => true))
  ).subscribe(() => {
    claimSuccessCounter.success = 0;
    claimSuccessCounter.total = 0;
  });

  const taskClaimEvents$: Observable<TaskClaimMetric> = taskPollingLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskPollingCycleEvent(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      const metric = taskLifecycleEventToSuccessMetric(taskEvent, claimSuccessCounter);
      claimSuccessCounter.success = metric.success;
      claimSuccessCounter.total = metric.total;
      return metric;
    })
  );

  return combineLatest([
    taskClaimEvents$.pipe(
      startWith({
        success: 0,
        total: 0,
      })
    ),
  ]).pipe(
    map(([claim]: [TaskClaimMetric]) => {
      return {
        key: 'task_claim',
        value: claim,
      } as AggregatedStat<TaskClaimMetric>;
    })
  );
}
