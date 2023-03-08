/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';

export function toIndicatorTypeLabel(
  indicatorType: SLOWithSummaryResponse['indicator']['type']
): string {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return i18n.translate('xpack.observability.slo.indicators.customKql', {
        defaultMessage: 'Custom KQL',
      });

    case 'sli.apm.transactionDuration':
      return i18n.translate('xpack.observability.slo.indicators.apmLatency', {
        defaultMessage: 'APM latency',
      });

    case 'sli.apm.transactionErrorRate':
      return i18n.translate('xpack.observability.slo.indicators.apmAvailability', {
        defaultMessage: 'APM availability',
      });
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
