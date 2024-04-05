/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRun } from '../task_events';
import { type SerializedHistogram, SimpleHistogram, MetricCounterService } from './lib';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MAX = 30000; // 30 seconds
const HDR_HISTOGRAM_BUCKET_SIZE = 100; // 100 millis

enum TaskClaimKeys {
  SUCCESS = 'success',
  TOTAL = 'total',
}
interface TaskClaimCounts extends JsonObject {
  [TaskClaimKeys.SUCCESS]: number;
  [TaskClaimKeys.TOTAL]: number;
}

export type TaskClaimMetric = TaskClaimCounts & {
  duration: SerializedHistogram;
  duration_values: number[];
};

export class TaskClaimMetricsAggregator implements ITaskMetricsAggregator<TaskClaimMetric> {
  private counter: MetricCounterService<TaskClaimCounts> = new MetricCounterService(
    Object.values(TaskClaimKeys)
  );
  private durationHistogram = new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);

  public initialMetric(): TaskClaimMetric {
    return {
      ...this.counter.initialMetrics(),
      duration: { counts: [], values: [] },
      duration_values: [],
    };
  }
  public collect(): TaskClaimMetric {
    return {
      ...this.counter.collect(),
      duration: this.durationHistogram.serialize(),
      duration_values: this.durationHistogram.getAllValues(),
    };
  }

  public reset() {
    this.counter.reset();
    this.durationHistogram.reset();
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const success = isOk((taskEvent as TaskRun).event);
    if (success) {
      this.counter.increment(TaskClaimKeys.SUCCESS);
    }
    this.counter.increment(TaskClaimKeys.TOTAL);

    if (taskEvent.timing) {
      const durationInMs = taskEvent.timing.stop - taskEvent.timing.start;
      this.durationHistogram.record(durationInMs);
    }
  }
}
