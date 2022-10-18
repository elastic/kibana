/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { combineLatest, filter, map, Observable, startWith } from 'rxjs';
import uuid from 'uuid';
import { parseIntervalAsMinute } from '../lib/intervals';
import { unwrap } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { ConcreteTaskInstance } from '../task';
import { isTaskRunEvent, TaskPersistence, TaskRun, TaskTiming } from '../task_events';
import { HealthStatus } from './monitoring_stats_stream';
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
  process_uuid: string; // unique identifier of the process that created these metrics
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
  runningAverageWindowSize: number
): AggregatedStatProvider<BackgroundTaskUtilizationStat> {
  const taskRunEventToAdhocStat = createTaskRunEventToAdhocStat(runningAverageWindowSize);
  const taskRunAdhocEvents$: Observable<Pick<BackgroundTaskUtilizationStat, 'adhoc'>> =
    taskPollingLifecycle.events.pipe(
      filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
      map((taskEvent: TaskLifecycleEvent) => ({
        taskEvent,
        ...unwrap((taskEvent as TaskRun).event),
      })),
      filter(({ persistence }) => persistence === TaskPersistence.NonRecurring),
      map(({ taskEvent }) => {
        return taskRunEventToAdhocStat(taskEvent.timing!);
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
      filter(({ persistence }) => persistence === TaskPersistence.Recurring),
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
          key: 'runtime',
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
  status: HealthStatus;
} {
  return {
    value: {
      process_uuid: uuid.v4(),
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
    status: HealthStatus.OK,
  };
}

function createTaskRunEventToAdhocStat(runningAverageWindowSize: number) {
  const createdCounterQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const actualQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const adjustedQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskCounterQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  return (timing: TaskTiming): Pick<BackgroundTaskUtilizationStat, 'adhoc'> => {
    const { duration, adjusted } = getServiceTimeStats(timing);
    return {
      adhoc: {
        created: {
          counter: createdCounterQueue(),
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
