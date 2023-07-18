/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { combineLatest, filter, map, Observable, startWith } from 'rxjs';
import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { isTaskPollingCycleEvent, TaskRun } from '../task_events';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { SuccessRate } from './metrics_stream';

export type TaskClaimSuccessRate = JsonObject & SuccessRate;

export function createTaskClaimAggregator(
  taskPollingLifecycle: TaskPollingLifecycle
): AggregatedStatProvider<TaskClaimSuccessRate> {
  const taskPollingCycleEventToSuccessMetric = createTaskPollingCycleEventToSuccessMetric();
  const taskClaimEvents$: Observable<TaskClaimSuccessRate> = taskPollingLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskPollingCycleEvent(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => taskPollingCycleEventToSuccessMetric(taskEvent))
  );

  return combineLatest([
    taskClaimEvents$.pipe(
      startWith({
        success: 0,
        total: 0,
      })
    ),
  ]).pipe(
    map(([claim]: [TaskClaimSuccessRate]) => {
      return {
        key: 'task_claim_success',
        value: claim,
      } as AggregatedStat<TaskClaimSuccessRate>;
    })
  );
}

function createTaskPollingCycleEventToSuccessMetric() {
  let allClaimEvents = 0;
  let successfulClaimEvents = 0;
  return (taskEvent: TaskLifecycleEvent): TaskClaimSuccessRate => {
    const success = isOk((taskEvent as TaskRun).event);
    return {
      success: (successfulClaimEvents += success ? 1 : 0),
      total: (allClaimEvents += 1),
    };
  };
}
