/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { get } from 'lodash';
import { combineLatest, filter, map, Observable, startWith } from 'rxjs';
import { CreateTaskCounter } from '../lib/create_task_counter';
import { parseIntervalAsMinute } from '../lib/intervals';
import { unwrap } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { ConcreteTaskInstance } from '../task';
import { isTaskRunEvent, TaskRun, TaskTiming } from '../task_events';
import { MonitoredStat } from './monitoring_stats_stream';
import { AggregatedStat, AggregatedStatProvider } from './runtime_statistics_aggregator';
import {
  AveragedStat,
  calculateRunningAverage,
  createRunningAveragedStat,
} from './task_run_calcultors';

export interface BackgroundTaskUtilizationStat extends JsonObject {
  adhoc: AdhocTaskStat;
  recurring: RecurringTaskStat;
}

interface TaskStat extends JsonObject {
  ran: {
    service_time: {
      actual: number[]; // total service time for running recurring tasks
      adjusted: number[]; // total service time adjusted for polling interval
      task_counter: number[]; // recurring tasks counter, only increases for the lifetime of the process
    };
  };
}

interface AdhocTaskStat extends TaskStat {
  created: {
    counter: number[]; // counter for number of ad hoc tasks created
  };
}

interface RecurringTaskStat extends TaskStat {
  tasks_per_min: number[];
}

export interface SummarizedBackgroundTaskUtilizationStat extends JsonObject {
  adhoc: {
    created: {
      counter: number;
    };
    ran: {
      service_time: {
        actual: AveragedStat;
        adjusted: AveragedStat;
        task_counter: number;
      };
    };
  };
  recurring: {
    tasks_per_min: AveragedStat;
    ran: {
      service_time: {
        actual: AveragedStat;
        adjusted: AveragedStat;
        task_counter: number;
      };
    };
  };
}

export function createBackgroundTaskUtilizationAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  runningAverageWindowSize: number,
  createTaskCounter: CreateTaskCounter
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
        return taskRunEventToAdhocStat(taskEvent.timing!, createTaskCounter);
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
        return taskRunEventToRecurringStat(taskEvent.timing!, task);
      })
    );

  return combineLatest([
    taskRunAdhocEvents$.pipe(
      startWith({
        adhoc: {
          created: {
            counter: [],
          },
          ran: {
            service_time: {
              actual: [],
              adjusted: [],
              task_counter: [],
            },
          },
        },
      })
    ),
    taskRunRecurringEvents$.pipe(
      startWith({
        recurring: {
          tasks_per_min: [],
          ran: {
            service_time: {
              actual: [],
              adjusted: [],
              task_counter: [],
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

export function summarizeUtilizationStat({ adhoc, recurring }: BackgroundTaskUtilizationStat): {
  value: SummarizedBackgroundTaskUtilizationStat;
} {
  return {
    value: {
      adhoc: {
        created: {
          counter: calculateSum(adhoc.created.counter),
        },
        ran: {
          service_time: {
            actual: calculateRunningAverage(adhoc.ran.service_time.actual),
            adjusted: calculateRunningAverage(adhoc.ran.service_time.adjusted),
            task_counter: calculateSum(adhoc.ran.service_time.task_counter),
          },
        },
      },
      recurring: {
        tasks_per_min: calculateRunningAverage(recurring.tasks_per_min),
        ran: {
          service_time: {
            actual: calculateRunningAverage(recurring.ran.service_time.actual),
            adjusted: calculateRunningAverage(recurring.ran.service_time.adjusted),
            task_counter: calculateSum(recurring.ran.service_time.task_counter),
          },
        },
      },
    },
  };
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
  stats: MonitoredStat<SummarizedBackgroundTaskUtilizationStat> | {};
} {
  return {
    last_update,
    stats: stats
      ? {
          timestamp: stats.timestamp,
          ...summarizeUtilizationStat(stats.value),
        }
      : {},
  };
}

function createTaskRunEventToAdhocStat(runningAverageWindowSize: number) {
  const createdCounterQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const actualQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const adjustedQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskCounterQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  return (
    timing: TaskTiming,
    createTaskCounter: CreateTaskCounter
  ): Pick<BackgroundTaskUtilizationStat, 'adhoc'> => {
    const { duration, adjusted } = getServiceTimeStats(timing);
    const created = createTaskCounter.count;
    createTaskCounter.reset();
    return {
      adhoc: {
        created: {
          counter: createdCounterQueue(created),
        },
        ran: {
          service_time: {
            actual: actualQueue(duration),
            adjusted: adjustedQueue(adjusted),
            task_counter: taskCounterQueue(1),
          },
        },
      },
    };
  };
}

function createTaskRunEventToRecurringStat(runningAverageWindowSize: number) {
  const tasksPerMinQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const actualQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const adjustedQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskCounterQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  return (
    timing: TaskTiming,
    task: ConcreteTaskInstance
  ): Pick<BackgroundTaskUtilizationStat, 'recurring'> => {
    const { duration, adjusted } = getServiceTimeStats(timing);
    const interval = parseIntervalAsMinute(task.schedule?.interval!);
    return {
      recurring: {
        tasks_per_min: tasksPerMinQueue(1 / interval),
        ran: {
          service_time: {
            actual: actualQueue(duration),
            adjusted: adjustedQueue(adjusted),
            task_counter: taskCounterQueue(1),
          },
        },
      },
    };
  };
}

function getServiceTimeStats(timing: TaskTiming) {
  const duration = timing!.stop - timing!.start;
  const pollInterval = 3 * 1000;
  const adjusted = Math.ceil(duration / pollInterval) * pollInterval;
  return { duration, adjusted };
}

function calculateSum(arr: number[]) {
  return arr.reduce((acc, s) => (acc += s), 0);
}
