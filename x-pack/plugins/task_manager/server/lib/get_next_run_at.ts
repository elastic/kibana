/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intervalFromDate } from './intervals';
import type { ConcreteTaskInstance } from '../task';

export function getNextRunAt(
  task: ConcreteTaskInstance,
  taskUpdates: Partial<Pick<ConcreteTaskInstance, 'runAt' | 'schedule'>>,
  taskDelayThresholdForPreciseScheduling: number = 0
): Date {
  const { runAt: originalRunAt, startedAt, schedule } = task;
  const { runAt: newRunAt, schedule: newSchedule } = taskUpdates;

  if (newRunAt) {
    return newRunAt;
  }

  const taskSchedule = newSchedule?.interval ?? schedule?.interval;
  const taskDelay = startedAt!.getTime() - originalRunAt.getTime();
  const scheduleFromDate =
    taskDelay < taskDelayThresholdForPreciseScheduling ? originalRunAt : startedAt!;

  // Ensure we also don't schedule in the past by performing the Math.max with Date.now()
  const nextCalculatedRunAt = Math.max(
    intervalFromDate(scheduleFromDate, taskSchedule)!.getTime(),
    Date.now()
  );

  return new Date(nextCalculatedRunAt);
}
