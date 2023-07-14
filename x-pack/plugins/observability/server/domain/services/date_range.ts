/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import moment from 'moment';
import { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema } from '@kbn/slo-schema';

import { DateRange, toMomentUnitOfTime } from '../models';
import type { TimeWindow } from '../models/time_window';

export const toDateRange = (timeWindow: TimeWindow, currentDate: Date = new Date()): DateRange => {
  if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    if (unit === 'weeks') {
      // moment startOf(week) returns sunday, but we want to stay consistent with es "now/w" date math which returns monday.
      const from = moment.utc(currentDate).startOf(unit).add(1, 'day');
      const to = moment.utc(currentDate).endOf(unit).add(1, 'day');

      return { from: from.toDate(), to: to.toDate() };
    }

    const from = moment.utc(currentDate).startOf(unit);
    const to = moment.utc(currentDate).endOf(unit);

    return { from: from.toDate(), to: to.toDate() };
  }

  if (rollingTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const now = moment.utc(currentDate).startOf('minute');

    return {
      from: now.clone().subtract(timeWindow.duration.value, unit).toDate(),
      to: now.toDate(),
    };
  }

  assertNever(timeWindow);
};
