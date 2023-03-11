/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { get } from 'lodash';
import { combineLatest, filter, map, Observable, startWith } from 'rxjs';
import { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { unwrap } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { ConcreteTaskInstance } from '../task';
import { isTaskRunEvent, TaskRun, TaskTiming } from '../task_events';
import { MonitoredStat } from './monitoring_stats_stream';
import { AggregatedStat, AggregatedStatProvider } from './runtime_statistics_aggregator';

export interface BackgroundTaskUtilizationStat extends JsonObject {
  adhoc: AdhocTaskStat;
  recurring: TaskStat;
}

interface TaskStat extends JsonObject {
  ran: {
    service_time: {
      actual: number; // total service time for running recurring tasks
      adjusted: number; // total service time adjusted for polling interval
      task_counter: number; // recurring tasks counter, only increases for the lifetime of the process
    };
  };
}

interface AdhocTaskStat extends TaskStat {
  created: {
    counter: number; // counter for number of ad hoc tasks created
  };
}

export function createBackgroundTaskUtilizationAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  runningAverageWindowSize: number,
  adHocTaskCounter: AdHocTaskCounter,
  pollInterval: number
): AggregatedStatProvider<BackgroundTaskUtilizationStat> {
  const taskRunEventToAdhocStat = createTaskRunEventToAdhocStat(runningAverageWindowSize);
  const taskRunAdhocEvents$: Observable<Pick<BackgroundTaskUtilizationStat, 'adhoc'>> =
    taskPollingLifecycle.events.pipe(
      filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
      map((taskEvent: TaskLifecycleEvent) => ({
        taskEvent,
        ...unwrap((taskEvent as TaskRun).event),
      })),
      filter(({ task }) => get(task, 'schedule.interval', null) == null),
      map(({ taskEvent }) => {
        return taskRunEventToAdhocStat(taskEvent.timing!, adHocTaskCounter, pollInterval);
      })
    );

  const taskRunEventToRecurringStat = createTaskRunEventToRecurringStat(runningAverageWindowSize);
  const taskRunRecurringEvents$: Observable<Pick<BackgroundTaskUtilizationStat, 'recurring'>> =
    taskPollingLifecycle.events.pipe(
      filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
      map((taskEvent: TaskLifecycleEvent) => ({
        taskEvent,
        ...unwrap((taskEvent as TaskRun).event),
      })),
      filter(({ task }) => get(task, 'schedule.interval', null) != null),
      map(({ taskEvent, task }) => {
        return taskRunEventToRecurringStat(taskEvent.timing!, task, pollInterval);
      })
    );

  return combineLatest([
    taskRunAdhocEvents$.pipe(
      startWith({
        adhoc: {
          created: {
            counter: 0,
          },
          ran: {
            service_time: {
              actual: 0,
              adjusted: 0,
              task_counter: 0,
            },
          },
        },
      })
    ),
    taskRunRecurringEvents$.pipe(
      startWith({
        recurring: {
          ran: {
            service_time: {
              actual: 0,
              adjusted: 0,
              task_counter: 0,
            },
          },
        },
      })
    ),
  ]).pipe(
    map(
      ([adhoc, recurring]: [
        Pick<BackgroundTaskUtilizationStat, 'adhoc'>,
        Pick<BackgroundTaskUtilizationStat, 'recurring'>
      ]) => {
        return {
          key: 'utilization',
          value: {
            ...adhoc,
            ...recurring,
          },
        } as AggregatedStat<BackgroundTaskUtilizationStat>;
      }
    )
  );
}

function hasTiming(taskEvent: TaskLifecycleEvent) {
  return !!taskEvent?.timing;
}

export function summarizeUtilizationStats({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  last_update,
  stats,
}: {
  last_update: string;
  stats: MonitoredStat<BackgroundTaskUtilizationStat> | undefined;
}): {
  last_update: string;
  stats: MonitoredStat<BackgroundTaskUtilizationStat> | null;
} {
  const utilizationStats = stats?.value;
  return {
    last_update,
    stats:
      stats && utilizationStats
        ? {
            timestamp: stats.timestamp,
            value: utilizationStats,
          }
        : null,
  };
}

function createTaskRunEventToAdhocStat(runningAverageWindowSize: number) {
  let createdCounter = 0;
  let actualCounter = 0;
  let adjustedCounter = 0;
  let taskCounter = 0;
  return (
    timing: TaskTiming,
    adHocTaskCounter: AdHocTaskCounter,
    pollInterval: number
  ): Pick<BackgroundTaskUtilizationStat, 'adhoc'> => {
    const { duration, adjusted } = getServiceTimeStats(timing, pollInterval);
    const created = adHocTaskCounter.count;
    adHocTaskCounter.reset();
    return {
      adhoc: {
        created: {
          counter: (createdCounter += created),
        },
        ran: {
          service_time: {
            actual: (actualCounter += duration),
            adjusted: (adjustedCounter += adjusted),
            task_counter: (taskCounter += 1),
          },
        },
      },
    };
  };
}

function createTaskRunEventToRecurringStat(runningAverageWindowSize: number) {
  let actualCounter = 0;
  let adjustedCounter = 0;
  let taskCounter = 0;
  return (
    timing: TaskTiming,
    task: ConcreteTaskInstance,
    pollInterval: number
  ): Pick<BackgroundTaskUtilizationStat, 'recurring'> => {
    const { duration, adjusted } = getServiceTimeStats(timing, pollInterval);
    return {
      recurring: {
        ran: {
          service_time: {
            actual: (actualCounter += duration),
            adjusted: (adjustedCounter += adjusted),
            task_counter: (taskCounter += 1),
          },
        },
      },
    };
  };
}

function getServiceTimeStats(timing: TaskTiming, pollInterval: number) {
  const duration = timing!.stop - timing!.start;
  const adjusted = Math.ceil(duration / pollInterval) * pollInterval;
  return { duration, adjusted };
}
