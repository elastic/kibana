/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRun } from '../task_events';
import { SuccessRate } from './metrics_stream';
export type { Metrics } from './metrics_stream';

export function taskLifecycleEventToSuccessMetric(
  taskEvent: TaskLifecycleEvent,
  currentMetric: SuccessRate
) {
  const success = isOk((taskEvent as TaskRun).event);
  return {
    success: currentMetric.success + (success ? 1 : 0),
    total: currentMetric.total + 1,
  };
}

export function taskLifecycleEventToDurationBucket(
  taskEvent: TaskLifecycleEvent,
  currentDuration: number[]
) {
  if (taskEvent.timing) {
    const durationInMs = taskEvent.timing.stop - taskEvent.timing.start;
  }
}
