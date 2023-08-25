/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRun } from '../task_events';
import { SimpleHistogram } from './simple_histogram';
import { SuccessRate, SuccessRateCounter } from './success_rate_counter';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MAX = 30000; // 30 seconds
const HDR_HISTOGRAM_BUCKET_SIZE = 100; // 100 millis

export type TaskClaimMetric = SuccessRate & {
  duration: {
    counts: number[];
    values: number[];
  };
};

export class TaskClaimMetricsAggregator implements ITaskMetricsAggregator<TaskClaimMetric> {
  private claimSuccessRate = new SuccessRateCounter();
  private durationHistogram = new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);

  public initialMetric(): TaskClaimMetric {
    return {
      ...this.claimSuccessRate.initialMetric(),
      duration: { counts: [], values: [] },
    };
  }
  public collect(): TaskClaimMetric {
    return {
      ...this.claimSuccessRate.get(),
      duration: this.serializeHistogram(),
    };
  }

  public reset() {
    this.claimSuccessRate.reset();
    this.durationHistogram.reset();
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const success = isOk((taskEvent as TaskRun).event);
    this.claimSuccessRate.increment(success);

    if (taskEvent.timing) {
      const durationInMs = taskEvent.timing.stop - taskEvent.timing.start;
      this.durationHistogram.record(durationInMs);
    }
  }

  private serializeHistogram() {
    const counts: number[] = [];
    const values: number[] = [];

    for (const { count, value } of this.durationHistogram.get(true)) {
      counts.push(count);
      values.push(value);
    }

    return { counts, values };
  }
}
