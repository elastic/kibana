/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
// eslint-disable-next-line import/no-extraneous-dependencies
import Histogram from 'native-hdr-histogram';
import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRun } from '../task_events';
import { SuccessRate, SuccessRateCounter } from './success_rate_counter';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MIN = 1; // 1 millis
const HDR_HISTOGRAM_MAX = 300000; // 5 min

export type TaskClaimMetric = SuccessRate & {
  duration: {
    counts: number[];
    values: number[];
  };
};

export class TaskClaimMetricsAggregator implements ITaskMetricsAggregator<TaskClaimMetric> {
  private claimSuccessRate = new SuccessRateCounter();
  private durationHistogram = new Histogram(HDR_HISTOGRAM_MIN, HDR_HISTOGRAM_MAX);

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
    for (const { count, value } of this.durationHistogram.recordedcounts()) {
      counts.push(count);
      values.push(value);
    }

    return { counts, values };
  }
}
