/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRun } from '../task_events';
import { SuccessRate, SuccessRateCounter } from './success_rate_counter';
import { ITaskMetricsAggregator } from './types';

export type TaskClaimMetric = SuccessRate;

export class TaskClaimMetricsAggregator implements ITaskMetricsAggregator<TaskClaimMetric> {
  private claimSuccessRate = new SuccessRateCounter();

  public initialMetric(): TaskClaimMetric {
    return this.claimSuccessRate.initialMetric();
  }
  public collect(): TaskClaimMetric {
    return this.claimSuccessRate.get();
  }

  public reset() {
    this.claimSuccessRate.reset();
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const success = isOk((taskEvent as TaskRun).event);
    this.claimSuccessRate.increment(success);
  }
}
