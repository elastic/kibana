/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorData, SLO } from '../../types/models';
import { toHighPrecision } from '../../utils/number';

export function computeBurnRate(slo: SLO, sliData: IndicatorData): number {
  const { good, total } = sliData;
  if (total === 0 || good >= total) {
    return 0;
  }

  const errorBudget = 1 - slo.objective.target;
  const errorRate = 1 - good / total;
  return toHighPrecision(errorRate / errorBudget);
}
