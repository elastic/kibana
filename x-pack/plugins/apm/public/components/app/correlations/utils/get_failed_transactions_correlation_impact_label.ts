/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FailedTransactionsCorrelation,
  FailedTransactionsCorrelationsImpactThreshold,
} from '../../../../../common/correlations/failed_transactions_correlations/types';
import { CORRELATIONS_IMPACT_THRESHOLD } from '../../../../../common/correlations/failed_transactions_correlations/constants';

export function getFailedTransactionsCorrelationImpactLabel(
  pValue: FailedTransactionsCorrelation['pValue'],
  isFallbackResult?: boolean
): {
  impact: FailedTransactionsCorrelationsImpactThreshold;
  color: string;
} | null {
  if (pValue === null) {
    return null;
  }

  if (isFallbackResult)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.VERY_LOW,
      color: 'default',
    };

  // The lower the p value, the higher the impact
  if (pValue >= 0 && pValue < 1e-6)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.HIGH,
      color: 'danger',
    };
  if (pValue >= 1e-6 && pValue < 0.001)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.MEDIUM,
      color: 'warning',
    };
  if (pValue >= 0.001 && pValue < 0.02)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.LOW,
      color: 'default',
    };

  return null;
}

export function getLatencyCorrelationImpactLabel(
  correlation: FailedTransactionsCorrelation['pValue'],
  isFallbackResult?: boolean
): {
  impact: FailedTransactionsCorrelationsImpactThreshold;
  color: string;
} | null {
  if (correlation === null || correlation < 0) {
    return null;
  }

  // The lower the p value, the higher the impact
  if (isFallbackResult)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.VERY_LOW,
      color: 'default',
    };
  if (correlation < 0.4)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.LOW,
      color: 'default',
    };
  if (correlation < 0.6)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.MEDIUM,
      color: 'warning',
    };
  if (correlation < 1)
    return {
      impact: CORRELATIONS_IMPACT_THRESHOLD.HIGH,
      color: 'danger',
    };

  return null;
}
