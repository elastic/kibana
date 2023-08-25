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
import { ErroredTask, isTaskExpiredEvent, isTaskRunEvent, RanTask, TaskRun } from '../task_events';
import { MetricCounterService } from './counter/metric_counter_service';
import { SimpleHistogram } from './simple_histogram';
import { ITaskMetricsAggregator } from './types';

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

const HDR_HISTOGRAM_MAX = 30000; // 30 seconds
const HDR_HISTOGRAM_BUCKET_SIZE = 100; // 100 millis

enum TaskRunKeys {
  SUCCESS = 'success',
  // RUN_WITHIN_TIMEOUT = 'on_time',
  TOTAL = 'total',
}

interface TaskRunCounts extends JsonObject {
  [TaskRunKeys.SUCCESS]: number;
  // [TaskRunKeys.RUN_WITHIN_TIMEOUT]: number;
  [TaskRunKeys.TOTAL]: number;
}

export interface AllTaskRunCounts extends JsonObject {
  overall: TaskRunCounts;
  by_type: {
    [key: string]: TaskRunCounts;
  };
}

export interface TaskRunMetric extends JsonObject {
  overall: AllTaskRunCounts['overall'] & {
    delay: {
      counts: number[];
      values: number[];
    };
  };
  by_type: AllTaskRunCounts['by_type'];
}

export class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
  private counter: MetricCounterService<AllTaskRunCounts> = new MetricCounterService(
    Object.values(TaskRunKeys).map((key) => `overall.${key}`)
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
    if (isTaskRunEvent(taskEvent)) {
      this.processTaskRunEvent(taskEvent);
    } else if (isTaskExpiredEvent(taskEvent)) {
      this.processTaskExpiredEvent(taskEvent);
    }
  }

  private processTaskRunEvent(taskEvent: TaskLifecycleEvent) {
    const { task }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
    const success = isOk((taskEvent as TaskRun).event);
    const taskType = task.taskType;
    const taskTypeGroup = this.getTaskTypeGroup(taskType);

    // increment the total counters
    this.counter.increment(`overall.${TaskRunKeys.TOTAL}`);
    this.counter.increment(`by_type.${taskType}.${TaskRunKeys.TOTAL}`);
    if (taskTypeGroup) {
      this.counter.increment(`by_type.${taskTypeGroup}.${TaskRunKeys.TOTAL}`);
    }

    // increment success counters
    if (success) {
      this.counter.increment(`overall.${TaskRunKeys.SUCCESS}`);
      this.counter.increment(`by_type.${taskType}.${TaskRunKeys.SUCCESS}`);
      if (taskTypeGroup) {
        this.counter.increment(`by_type.${taskTypeGroup}.${TaskRunKeys.SUCCESS}`);
      }
    }
  }

  private processTaskExpiredEvent(taskEvent: TaskLifecycleEvent) {}

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
