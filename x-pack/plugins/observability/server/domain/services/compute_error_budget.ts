/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { ErrorBudget, IndicatorData, SLO, toMomentUnitOfTime } from '../models';
import { toHighPrecision } from '../../utils/number';

// More details about calculus: https://github.com/elastic/kibana/issues/143980
export function computeErrorBudget(slo: SLO, sliData: IndicatorData): ErrorBudget {
  const { good, total } = sliData;
  if (total === 0 || good >= total) {
    const initialErrorBudget = 1 - slo.objective.target;
    return toErrorBudget(initialErrorBudget, 0);
  }

  if (rollingTimeWindowSchema.is(slo.timeWindow)) {
    return computeForRolling(slo, sliData);
  }

  if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      return computeForCalendarAlignedWithTimeslices(slo, sliData);
    }

    if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      return computeForCalendarAlignedWithOccurrences(slo, sliData);
    }
  }

  throw new Error('Invalid slo time window');
}

function computeForRolling(slo: SLO, sliData: IndicatorData) {
  const { good, total } = sliData;
  const initialErrorBudget = 1 - slo.objective.target;
  const consumedErrorBudget = (total - good) / (total * initialErrorBudget);
  return toErrorBudget(initialErrorBudget, consumedErrorBudget);
}

function computeForCalendarAlignedWithOccurrences(slo: SLO, sliData: IndicatorData) {
  const { good, total, dateRange: dateRange } = sliData;
  const initialErrorBudget = 1 - slo.objective.target;
  const now = moment();

  const durationCalendarPeriod = moment(dateRange.to).diff(dateRange.from, 'minutes');
  const durationSinceBeginning = now.isAfter(dateRange.to)
    ? durationCalendarPeriod
    : moment(now).diff(dateRange.from, 'minutes');

  const totalEventsEstimatedAtPeriodEnd = Math.round(
    (total / durationSinceBeginning) * durationCalendarPeriod
  );

  const consumedErrorBudget =
    (total - good) / (totalEventsEstimatedAtPeriodEnd * initialErrorBudget);
  return toErrorBudget(initialErrorBudget, consumedErrorBudget, true);
}

function computeForCalendarAlignedWithTimeslices(slo: SLO, sliData: IndicatorData) {
  const { good, total, dateRange: dateRange } = sliData;
  const initialErrorBudget = 1 - slo.objective.target;

  const dateRangeDurationInUnit = moment(dateRange.to).diff(
    dateRange.from,
    toMomentUnitOfTime(slo.objective.timesliceWindow!.unit)
  );
  const totalSlices = Math.ceil(dateRangeDurationInUnit / slo.objective.timesliceWindow!.value);
  const consumedErrorBudget = (total - good) / (totalSlices * initialErrorBudget);

  return toErrorBudget(initialErrorBudget, consumedErrorBudget);
}

function toErrorBudget(
  initial: number,
  consumed: number,
  isEstimated: boolean = false
): ErrorBudget {
  return {
    initial: toHighPrecision(initial),
    consumed: toHighPrecision(consumed),
    remaining: Math.max(toHighPrecision(1 - consumed), 0),
    isEstimated,
  };
}
