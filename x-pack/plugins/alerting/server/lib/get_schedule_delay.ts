/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTaskInstance } from '../task_runner/types';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;
export interface ScheduleDelay {
  scheduled: string;
  scheduleDelay: number;
}
export function getScheduleDelay(runDate: Date, taskInstance: RuleTaskInstance): ScheduleDelay {
  // if we are past the task retryAt time, use that for scheduled, otherwise use task runAt
  const scheduled: Date =
    taskInstance.retryAt && taskInstance.retryAt < runDate
      ? taskInstance.retryAt
      : taskInstance.runAt;

  const scheduleDelay = runDate.getTime() - scheduled.getTime();

  return {
    scheduled: scheduled.toISOString(),
    scheduleDelay: Millis2Nanos * scheduleDelay,
  };
}
