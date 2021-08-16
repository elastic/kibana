/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FailureCorrelationImpactThreshold } from '../../../../../common/search_strategies/failure_correlations/types';
import { FAILURE_CORRELATION_IMPACT_THRESHOLD } from '../../../../../common/search_strategies/failure_correlations/constants';

export function getFailedTransactionsCorrelationImpactLabel(
  pValue: number
): FailureCorrelationImpactThreshold | null {
  if (pValue > 0 && pValue < 1e-6)
    return FAILURE_CORRELATION_IMPACT_THRESHOLD.HIGH;
  if (pValue >= 1e-6 && pValue < 0.001)
    return FAILURE_CORRELATION_IMPACT_THRESHOLD.MEDIUM;
  if (pValue >= 0.001 && pValue <= 0.02)
    return FAILURE_CORRELATION_IMPACT_THRESHOLD.LOW;

  return null;
}
