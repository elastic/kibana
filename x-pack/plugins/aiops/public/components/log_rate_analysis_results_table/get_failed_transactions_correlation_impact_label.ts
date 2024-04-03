/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// This is currently copied over from the APM plugin
const CORRELATIONS_IMPACT_THRESHOLD = {
  HIGH: i18n.translate('xpack.aiops.correlations.highImpactText', {
    defaultMessage: 'High',
  }),
  MEDIUM: i18n.translate('xpack.aiops.correlations.mediumImpactText', {
    defaultMessage: 'Medium',
  }),
  LOW: i18n.translate('xpack.aiops.correlations.lowImpactText', {
    defaultMessage: 'Low',
  }),
  VERY_LOW: i18n.translate('xpack.aiops.correlations.veryLowImpactText', {
    defaultMessage: 'Very low',
  }),
} as const;

type FailedTransactionsCorrelationsImpactThreshold =
  typeof CORRELATIONS_IMPACT_THRESHOLD[keyof typeof CORRELATIONS_IMPACT_THRESHOLD];

export function getFailedTransactionsCorrelationImpactLabel(
  pValue: number | null,
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
