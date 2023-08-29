/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { merge } from 'lodash';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { ErroredTask, RanTask, TaskRun } from '../task_events';
import { MetricCounterService } from './counter/metric_counter_service';
import { SimpleHistogram } from './simple_histogram';
import { ITaskMetricsAggregator } from './types';

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

const HDR_HISTOGRAM_MAX = 30000; // 30 seconds
const HDR_HISTOGRAM_BUCKET_SIZE = 100; // 100 millis

enum TaskRunKeys {
  SUCCESS = 'success',
  RUN_WITHIN_TIMEOUT = 'on_time',
  TOTAL = 'total',
}

enum TaskRunMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

interface TaskRunCounts extends JsonObject {
  [TaskRunKeys.SUCCESS]: number;
  [TaskRunKeys.RUN_WITHIN_TIMEOUT]: number;
  [TaskRunKeys.TOTAL]: number;
}

export interface TaskRunMetrics extends JsonObject {
  [TaskRunMetricKeys.OVERALL]: TaskRunCounts;
  [TaskRunMetricKeys.BY_TYPE]: {
    [key: string]: TaskRunCounts;
  };
}

export interface TaskRunMetric extends JsonObject {
  overall: TaskRunMetrics['overall'] & {
    delay: {
      counts: number[];
      values: number[];
    };
  };
  by_type: TaskRunMetrics['by_type'];
}

export class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
  private counter: MetricCounterService<TaskRunMetrics> = new MetricCounterService(
    Object.values(TaskRunKeys),
    TaskRunMetricKeys.OVERALL
  );
  private delayHistogram = new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);

  public initialMetric(): TaskRunMetric {
    return merge(this.counter.initialMetrics(), {
      by_type: {},
      overall: { delay: { counts: [], values: [] } },
    });
  }

  public collect(): TaskRunMetric {
    return merge(this.counter.collect(), { overall: { delay: this.serializeHistogram() } });
  }

  public reset() {
    this.counter.reset();
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const { task, isExpired }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
    const success = isOk((taskEvent as TaskRun).event);
    const taskType = task.taskType.replaceAll('.', '__');
    const taskTypeGroup = this.getTaskTypeGroup(taskType);

    // increment the total counters
    this.incrementCounters(TaskRunKeys.TOTAL, taskType, taskTypeGroup);

    // increment success counters
    if (success) {
      this.incrementCounters(TaskRunKeys.SUCCESS, taskType, taskTypeGroup);
    }

    // increment expired counters
    if (!isExpired) {
      this.incrementCounters(TaskRunKeys.RUN_WITHIN_TIMEOUT, taskType, taskTypeGroup);
    }
  }

  private incrementCounters(key: TaskRunKeys, taskType: string, group?: string) {
    this.counter.increment(key, TaskRunMetricKeys.OVERALL);
    this.counter.increment(key, `${TaskRunMetricKeys.BY_TYPE}.${taskType}`);
    if (group) {
      this.counter.increment(key, `${TaskRunMetricKeys.BY_TYPE}.${group}`);
    }
  }

  private getTaskTypeGroup(taskType: string): string | undefined {
    for (const group of taskTypeGrouping) {
      if (taskType.startsWith(group)) {
        return group.replaceAll(':', '');
      }
    }
  }

  private serializeHistogram() {
    const counts: number[] = [];
    const values: number[] = [];

    for (const { count, value } of this.delayHistogram.get(true)) {
      counts.push(count);
      values.push(value);
    }

    return { counts, values };
  }
}
