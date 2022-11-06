/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ErrorBudget, IndicatorData, SLO, toMomentUnitOfTime } from '../../types/models';
import {
  calendarAlignedTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '../../types/schema';
import { toHighPrecision } from '../../utils/number';

// More details about calculus: https://github.com/elastic/kibana/issues/143980
export function computeErrorBudget(slo: SLO, sliData: IndicatorData): ErrorBudget {
  const { good, total, date_range: dateRange } = sliData;
  const initialErrorBudget = toHighPrecision(1 - slo.objective.target);
  if (total === 0 || good >= total) {
    return {
      initial: initialErrorBudget,
      consumed: 0,
      remaining: 1,
    };
  }

  if (
    timeslicesBudgetingMethodSchema.is(slo.budgeting_method) &&
    calendarAlignedTimeWindowSchema.is(slo.time_window)
  ) {
    const dateRangeDurationInUnit = moment(dateRange.to).diff(
      dateRange.from,
      toMomentUnitOfTime(slo.objective.timeslice_window!.unit)
    );
    const totalSlices = Math.ceil(dateRangeDurationInUnit / slo.objective.timeslice_window!.value);

    const consumedErrorBudget = toHighPrecision(
      (total - good) / (totalSlices * initialErrorBudget)
    );
    const remainingErrorBudget = Math.max(toHighPrecision(1 - consumedErrorBudget), 0);
    return {
      initial: initialErrorBudget,
      consumed: consumedErrorBudget,
      remaining: remainingErrorBudget,
    };
  }

  const consumedErrorBudget = toHighPrecision((total - good) / (total * initialErrorBudget));
  const remainingErrorBudget = Math.max(toHighPrecision(1 - consumedErrorBudget), 0);

  return {
    initial: initialErrorBudget,
    consumed: consumedErrorBudget,
    remaining: remainingErrorBudget,
  };
}
