/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ScheduleIntervalSchemaType as Schedule } from '.';

interface ScheduleTypes {
  minutely: {
    minutes: number;
  };
  hourly: {
    hours: number;
  };
  daily: {
    days: number;
  };
}

function isMinutely(schedule: Schedule): schedule is ScheduleTypes['minutely'] {
  return (schedule as { minutes: number }).minutes != null;
}

function isHourly(schedule: Schedule): schedule is ScheduleTypes['hourly'] {
  return (schedule as { hours: number }).hours != null;
}

function isDaily(schedule: Schedule): schedule is ScheduleTypes['daily'] {
  return (schedule as { days: number }).days != null;
}

export function getNextRun(schedule: Schedule) {
  if (isMinutely(schedule)) {
    return moment().add(schedule.minutes, 'minutes');
  }
  if (isHourly(schedule)) {
    return moment().add(schedule.hours, 'hours');
  }
  if (isDaily(schedule)) {
    return moment().add(schedule.days, 'days');
  }

  throw new Error(`Could not determine schedule type`);
}
