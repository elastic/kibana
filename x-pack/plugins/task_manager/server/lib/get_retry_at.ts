/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random } from 'lodash';
import { ConcreteTaskInstance, DEFAULT_TIMEOUT, TaskDefinition } from '../task';
import { isRetryableError } from '../task_running';
import { intervalFromDate, maxIntervalFromDate } from './intervals';

export function getRetryAt(
  task: ConcreteTaskInstance,
  taskDefinition: TaskDefinition | undefined
): Date | undefined {
  const taskTimeout = getTimeout(task, taskDefinition);
  if (task.schedule) {
    return maxIntervalFromDate(new Date(), task.schedule.interval, taskTimeout);
  }

  return getRetryDate({
    attempts: task.attempts + 1,
    // Fake an error. This allows retry logic when tasks keep timing out
    // and lets us set a proper "retryAt" value each time.
    error: new Error('Task timeout'),
    addDuration: taskTimeout,
  });
}

export function getRetryDate({
  error,
  attempts,
  addDuration,
}: {
  error: Error;
  attempts: number;
  addDuration?: string;
}): Date | undefined {
  const retry: boolean | Date = isRetryableError(error) ?? true;

  let result;
  if (retry instanceof Date) {
    result = retry;
  } else if (retry === true) {
    result = new Date(Date.now() + calculateDelayBasedOnAttempts(attempts));
  }

  // Add a duration to the result
  if (addDuration && result) {
    result = intervalFromDate(result, addDuration)!;
  }
  return result;
}

export function calculateDelayBasedOnAttempts(attempts: number) {
  // Return 30s for the first retry attempt
  if (attempts === 1) {
    return 30 * 1000;
  } else {
    const defaultBackoffPerFailure = 5 * 60 * 1000;
    const maxDelay = 60 * 60 * 1000;
    // For each remaining attempt return an exponential delay with jitter that is capped at 1 hour.
    // We adjust the attempts by 2 to ensure that delay starts at 5m for the second retry attempt
    // and increases exponentially from there.
    return random(Math.min(maxDelay, defaultBackoffPerFailure * Math.pow(2, attempts - 2)));
  }
}

export function getTimeout(
  task: ConcreteTaskInstance,
  taskDefinition: TaskDefinition | undefined
): string {
  if (task.schedule) {
    return taskDefinition?.timeout ?? DEFAULT_TIMEOUT;
  }

  return task.timeoutOverride ? task.timeoutOverride : taskDefinition?.timeout ?? DEFAULT_TIMEOUT;
}
