/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScheduleUnit, SyntheticsMonitorSchedule } from '../runtime_types';

export function scheduleToMilli(schedule: SyntheticsMonitorSchedule): number {
  const timeValue = parseInt(schedule.number, 10);
  return timeValue * getMilliFactorForScheduleUnit(schedule.unit);
}

function getMilliFactorForScheduleUnit(scheduleUnit: ScheduleUnit): number {
  switch (scheduleUnit) {
    case ScheduleUnit.SECONDS:
      return 1000;
    case ScheduleUnit.MINUTES:
      return 60 * 1000;
    default:
      throw new Error(`Unit ${scheduleUnit} is not supported`);
  }
}
