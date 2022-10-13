/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import moment from 'moment';

import type { TimeWindow } from '../../types/models/time_window';
import {
  calendarAlignedTimeWindowSchema,
  DurationUnit,
  rollingTimeWindowSchema,
} from '../../types/schema';

export interface DateRange {
  from: Date;
  to: Date;
}

export const toDateRange = (timeWindow: TimeWindow, currentDate: Date = new Date()): DateRange => {
  if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const now = moment(currentDate).startOf('minute');
    const startTime = moment(timeWindow.calendar.start_time);

    const differenceInUnit = now.diff(startTime, unit);
    if (differenceInUnit < 0) {
      throw new Error('Cannot compute date range with future starting time');
    }

    const from = startTime.clone().add(differenceInUnit, unit);
    const to = from.clone().add(timeWindow.duration.value, unit);

    return { from: from.toDate(), to: to.toDate() };
  }

  if (rollingTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const now = moment(currentDate).startOf('minute');

    return {
      from: now.clone().subtract(timeWindow.duration.value, unit).toDate(),
      to: now.toDate(),
    };
  }

  assertNever(timeWindow);
};

const toMomentUnitOfTime = (unit: DurationUnit): moment.unitOfTime.Diff => {
  switch (unit) {
    case DurationUnit.d:
      return 'days';
    case DurationUnit.w:
      return 'weeks';
    case DurationUnit.M:
      return 'months';
    case DurationUnit.Q:
      return 'quarters';
    case DurationUnit.Y:
      return 'years';
    default:
      assertNever(unit);
  }
};
