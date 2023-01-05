/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { asPercent } from '../../../../common/utils/formatters';

export function getSloDifference(slo: SLOWithSummaryResponse) {
  if (slo.summary.status === 'NO_DATA') {
    return {
      value: Number.NaN,
      label: NOT_AVAILABLE_LABEL,
    };
  }
  const difference = slo.summary.sliValue - slo.objective.target;

  return {
    value: difference,
    label: `${difference > 0 ? '+' : ''}${asPercent(difference, 1)}`,
  };
}
