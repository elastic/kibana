/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { combineLatest, filter, interval, map, merge, Observable, startWith } from 'rxjs';
import { unwrap } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { ErroredTask, isTaskRunEvent, RanTask, TaskRun } from '../task_events';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { SuccessRate } from './metrics_stream';
import { TaskManagerConfig } from '../config';
import { taskLifecycleEventToSuccessMetric } from './utils';

export interface TaskRunMetric extends JsonObject {
  overall: SuccessRate;
  by_type: {
    [key: string]: SuccessRate;
  };
}

export function createTaskRunMetricsAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  config: TaskManagerConfig,
  resetMetrics$: Observable<boolean>
): AggregatedStatProvider<TaskRunMetric> {
  const overallSuccessCounter: SuccessRate = { total: 0, success: 0 };
  const taskRunSuccessCounter: Map<string, SuccessRate> = new Map();
  // Resets the run counters either when the reset interval has passed or
  // a resetMetrics$ event is received
  merge(
    interval(config.metrics_reset_interval).pipe(map(() => true)),
    resetMetrics$.pipe(map(() => true))
  ).subscribe(() => {
    overallSuccessCounter.success = 0;
    overallSuccessCounter.total = 0;
    for (const taskType of taskRunSuccessCounter.keys()) {
      taskRunSuccessCounter.set(taskType, {
        success: 0,
        total: 0,
      });
    }
  });

  const taskRunEvents$: Observable<TaskRunMetric> = taskPollingLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      const { task }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
      const taskType = task.taskType;
      const currentMetric: SuccessRate = taskRunSuccessCounter.has(taskType)
        ? taskRunSuccessCounter.get(taskType)!
        : {
            success: 0,
            total: 0,
          };
      const taskTypeMetric = taskLifecycleEventToSuccessMetric(taskEvent, currentMetric);
      const overallMetric = taskLifecycleEventToSuccessMetric(taskEvent, overallSuccessCounter);

      overallSuccessCounter.success = overallMetric.success;
      overallSuccessCounter.total = overallMetric.total;

      taskRunSuccessCounter.set(taskType, {
        success: taskTypeMetric.success,
        total: taskTypeMetric.total,
      });

      return { overall: overallMetric, by_type: Object.fromEntries(taskRunSuccessCounter) };
    })
  );

  return combineLatest([
    taskRunEvents$.pipe(startWith({ overall: { success: 0, total: 0 }, by_type: {} })),
  ]).pipe(
    map(([runMetrics]: [TaskRunMetric]) => {
      return {
        key: 'task_run',
        value: runMetrics,
      } as AggregatedStat<TaskRunMetric>;
    })
  );
}
