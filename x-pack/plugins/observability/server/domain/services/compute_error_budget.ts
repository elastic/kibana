/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorBudget, IndicatorData, SLO } from '../../types/models';
import { toHighPrecision } from '../../utils/number';

export function computeErrorBudget(slo: SLO, sliData: IndicatorData): ErrorBudget {
  const { good, total } = sliData;
  const initialErrorBudget = toHighPrecision(1 - slo.objective.target);
  if (total === 0 || good >= total) {
    return {
      initial: initialErrorBudget,
      consumed: 0,
      remaining: 1,
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
