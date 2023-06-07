/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';
import { CompositeSLO, IndicatorData, SLO } from '../models';

/**
 * A Burn Rate is computed with the Indicator Data retrieved from a specific lookback period
 * It tells how fast we are consumming our error budget during a specific period
 */
export function computeBurnRate(slo: SLO | CompositeSLO, sliData: IndicatorData): number {
  const { sli } = sliData;
  if (sli < 0 || sli > 1) {
    return 0;
  }

  const errorBudget = 1 - slo.objective.target;
  const errorRate = 1 - sli;
  return toHighPrecision(errorRate / errorBudget);
}
