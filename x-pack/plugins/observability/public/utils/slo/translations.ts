/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';

export const INDICATOR_CUSTOM_KQL = i18n.translate('xpack.observability.slo.indicators.customKql', {
  defaultMessage: 'Custom KQL',
});

export const INDICATOR_APM_LATENCY = i18n.translate(
  'xpack.observability.slo.indicators.apmLatency',
  { defaultMessage: 'APM latency' }
);

export const INDICATOR_APM_AVAILABILITY = i18n.translate(
  'xpack.observability.slo.indicators.apmAvailability',
  { defaultMessage: 'APM availability' }
);

export function toIndicatorTypeLabel(
  indicatorType: SLOWithSummaryResponse['indicator']['type']
): string {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return INDICATOR_CUSTOM_KQL;

    case 'sli.apm.transactionDuration':
      return INDICATOR_APM_LATENCY;

    case 'sli.apm.transactionErrorRate':
      return INDICATOR_APM_AVAILABILITY;
    default:
      assertNever(indicatorType);
  }
}

export function toBudgetingMethodLabel(
  budgetingMethod: SLOWithSummaryResponse['budgetingMethod']
): string {
  if (budgetingMethod === 'occurrences') {
    return i18n.translate('xpack.observability.slo.budgetingMethod.occurrences', {
      defaultMessage: 'Occurrences',
    });
  }

  return i18n.translate('xpack.observability.slo.budgetingMethod.timeslices', {
    defaultMessage: 'Timeslices',
  });
}
