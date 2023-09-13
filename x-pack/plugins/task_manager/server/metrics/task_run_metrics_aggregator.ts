/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { ErroredTask, RanTask, TaskRun } from '../task_events';
import { MetricCounterService } from './counter/metric_counter_service';
import { ITaskMetricsAggregator } from './types';

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

enum TaskRunKeys {
  SUCCESS = 'success',
  NOT_TIMED_OUT = 'not_timed_out',
  TOTAL = 'total',
}

enum TaskRunMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

interface TaskRunCounts extends JsonObject {
  [TaskRunKeys.SUCCESS]: number;
  [TaskRunKeys.NOT_TIMED_OUT]: number;
  [TaskRunKeys.TOTAL]: number;
}

export interface TaskRunMetric extends JsonObject {
  [TaskRunMetricKeys.OVERALL]: TaskRunCounts;
  [TaskRunMetricKeys.BY_TYPE]: {
    [key: string]: TaskRunCounts;
  };
}

export class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
  private counter: MetricCounterService<TaskRunMetric> = new MetricCounterService(
    Object.values(TaskRunKeys),
    TaskRunMetricKeys.OVERALL
  );

  public initialMetric(): TaskRunMetric {
    return this.counter.initialMetrics();
  }

  public collect(): TaskRunMetric {
    return this.counter.collect();
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
      this.incrementCounters(TaskRunKeys.NOT_TIMED_OUT, taskType, taskTypeGroup);
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
}
