/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ErrorBudget, IndicatorData, SLO, toMomentUnitOfTime } from '../models';
import {
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '../../types/schema';
import { toHighPrecision } from '../../utils/number';

// More details about calculus: https://github.com/elastic/kibana/issues/143980
export function computeErrorBudget(slo: SLO, sliData: IndicatorData): ErrorBudget {
  const { good, total, date_range: dateRange } = sliData;

  const initialErrorBudget = 1 - slo.objective.target;
  if (total === 0 || good >= total) {
    return toErrorBudget(initialErrorBudget, 0);
  }

  if (rollingTimeWindowSchema.is(slo.time_window)) {
    const consumedErrorBudget = (total - good) / (total * initialErrorBudget);
    return toErrorBudget(initialErrorBudget, consumedErrorBudget);
  }

  if (calendarAlignedTimeWindowSchema.is(slo.time_window)) {
    if (timeslicesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const dateRangeDurationInUnit = moment(dateRange.to).diff(
        dateRange.from,
        toMomentUnitOfTime(slo.objective.timeslice_window!.unit)
      );
      const totalSlices = Math.ceil(
        dateRangeDurationInUnit / slo.objective.timeslice_window!.value
      );

      const consumedErrorBudget = (total - good) / (totalSlices * initialErrorBudget);
      return toErrorBudget(initialErrorBudget, consumedErrorBudget);
    }

    if (occurrencesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const now = moment();
      const durationCalendarPeriod = moment(dateRange.to).diff(dateRange.from, 'seconds');
      const durationSinceBeginning = now.isAfter(dateRange.to)
        ? durationCalendarPeriod
        : moment(now).diff(dateRange.from, 'seconds');

      const totalEventsEstimatedAtPeriodEnd = Math.round(
        (total / durationSinceBeginning) * durationCalendarPeriod
      );

      const consumedErrorBudget =
        (total - good) / (totalEventsEstimatedAtPeriodEnd * initialErrorBudget);
      return toErrorBudget(initialErrorBudget, consumedErrorBudget);
    }
  }

  throw new Error('Invalid slo time window');
}

function toErrorBudget(initial: number, consumed: number): ErrorBudget {
  return {
    initial: toHighPrecision(initial),
    consumed: toHighPrecision(consumed),
    remaining: Math.max(toHighPrecision(1 - consumed), 0),
  };
}
