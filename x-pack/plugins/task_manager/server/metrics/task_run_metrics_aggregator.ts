/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { merge } from 'lodash';
import { isUserError } from '../task_running';
import { isOk, Ok, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import {
  ErroredTask,
  isTaskManagerStatEvent,
  isTaskRunEvent,
  RanTask,
  TaskManagerStat,
  TaskRun,
} from '../task_events';
import type { SerializedHistogram } from './lib';
import { getTaskTypeGroup, MetricCounterService, SimpleHistogram } from './lib';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MAX = 5400; // 90 minutes
const HDR_HISTOGRAM_BUCKET_SIZE = 10; // 10 seconds

enum TaskRunKeys {
  SUCCESS = 'success',
  NOT_TIMED_OUT = 'not_timed_out',
  TOTAL = 'total',
  TOTAL_ERRORS = 'total_errors',
  USER_ERRORS = 'user_errors',
  FRAMEWORK_ERRORS = 'framework_errors',
}

enum TaskRunMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

interface TaskRunCounts extends JsonObject {
  [TaskRunKeys.SUCCESS]: number;
  [TaskRunKeys.NOT_TIMED_OUT]: number;
  [TaskRunKeys.TOTAL]: number;
  [TaskRunKeys.USER_ERRORS]: number;
  [TaskRunKeys.FRAMEWORK_ERRORS]: number;
}

export interface TaskRunMetrics extends JsonObject {
  [TaskRunMetricKeys.OVERALL]: TaskRunCounts;
  [TaskRunMetricKeys.BY_TYPE]: {
    [key: string]: TaskRunCounts;
  };
}

export interface TaskRunMetric extends JsonObject {
  overall: TaskRunMetrics['overall'] & {
    delay: SerializedHistogram;
    delay_values: number[];
  };
  by_type: TaskRunMetrics['by_type'];
}

export class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
  private counter: MetricCounterService<TaskRunMetric> = new MetricCounterService(
    Object.values(TaskRunKeys),
    TaskRunMetricKeys.OVERALL
  );
  private delayHistogram = new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);

  public initialMetric(): TaskRunMetric {
    return merge(this.counter.initialMetrics(), {
      by_type: {},
      overall: {
        delay: { counts: [], values: [] },
        delay_values: [],
      },
    });
  }

  public collect(): TaskRunMetric {
    return merge(this.counter.collect(), {
      overall: {
        delay: this.delayHistogram.serialize(),
        delay_values: this.delayHistogram.getAllValues(),
      },
    });
  }

  public reset() {
    this.counter.reset();
    this.delayHistogram.reset();
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    if (isTaskRunEvent(taskEvent)) {
      this.processTaskRunEvent(taskEvent);
    } else if (isTaskManagerStatEvent(taskEvent)) {
      this.processTaskManagerStatEvent(taskEvent);
    }
  }

  private processTaskRunEvent(taskEvent: TaskRun) {
    const taskRunResult: RanTask | ErroredTask = unwrap(taskEvent.event);
    const { task, isExpired } = taskRunResult;
    const success = isOk((taskEvent as TaskRun).event);
    const taskType = task.taskType.replaceAll('.', '__');
    const taskTypeGroup = getTaskTypeGroup(taskType);

    // increment the total counters
    this.incrementCounters(TaskRunKeys.TOTAL, taskType, taskTypeGroup);

    // increment success counters
    if (success) {
      this.incrementCounters(TaskRunKeys.SUCCESS, taskType, taskTypeGroup);
    } else {
      // increment total error counts
      this.incrementCounters(TaskRunKeys.TOTAL_ERRORS, taskType, taskTypeGroup);

      if (isUserError((taskRunResult as ErroredTask).error)) {
        // increment the user error counters
        this.incrementCounters(TaskRunKeys.USER_ERRORS, taskType, taskTypeGroup);
      } else {
        // increment the framework error counters
        this.incrementCounters(TaskRunKeys.FRAMEWORK_ERRORS, taskType, taskTypeGroup);
      }
    }

    // increment expired counters
    if (!isExpired) {
      this.incrementCounters(TaskRunKeys.NOT_TIMED_OUT, taskType, taskTypeGroup);
    }
  }

  private processTaskManagerStatEvent(taskEvent: TaskManagerStat) {
    if (taskEvent.id === 'runDelay') {
      const delayInSec = Math.round((taskEvent.event as Ok<number>).value);
      this.delayHistogram.record(delayInSec);
    }
  }

  private incrementCounters(key: TaskRunKeys, taskType: string, group?: string) {
    this.counter.increment(key, TaskRunMetricKeys.OVERALL);
    this.counter.increment(key, `${TaskRunMetricKeys.BY_TYPE}.${taskType}`);
    if (group) {
      this.counter.increment(key, `${TaskRunMetricKeys.BY_TYPE}.${group}`);
    }
  }
}
