/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import {
  calendarAlignedTimeWindowSchema,
  DurationUnit,
  rollingTimeWindowSchema,
  TimeWindow,
} from '../../types/schema';

export interface DateRange {
  from: Date;
  to: Date;
}

export const toDateRange = (timeWindow: TimeWindow, currentDate: Date): DateRange => {
  if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const now = moment(currentDate).tz(timeWindow.calendar.time_zone);
    const startTime = moment.tz(timeWindow.calendar.start_time, timeWindow.calendar.time_zone);

    const differenceInUnit = now.diff(startTime, unit);
    if (differenceInUnit < 0) {
      throw new Error('Cannot compute date range with future starting time');
    }

    const from = startTime.clone().add(differenceInUnit, unit);
    const to = from.clone().add(timeWindow.duration.value, unit);

    return { from: from.utc().toDate(), to: to.utc().toDate() };
  }

  if (rollingTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const now = moment.utc(currentDate);

    return {
      from: now.clone().subtract(timeWindow.duration.value, unit).toDate(),
      to: now.toDate(),
    };
  }

  throw new Error('Invalid time window');
};

const toMomentUnitOfTime = (unit: DurationUnit): moment.unitOfTime.Diff => {
  switch (unit) {
    case 'm':
      return 'minutes';
    case 'h':
      return 'hours';
    case 'd':
      return 'days';
    case 'w':
      return 'weeks';
    case 'M':
      return 'months';
    case 'Q':
      return 'quarters';
    case 'Y':
      return 'years';
  }

  throw new Error('Invalid unit');
};
