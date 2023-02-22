/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { euiLightVars } from '@kbn/ui-theme';
export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloIndicatorTypeBadge({ slo }: Props) {
  return (
    <div>
      <EuiBadge color={euiLightVars.euiColorDisabled}>
        {toIndicatorLabel(slo.indicator.type)}
      </EuiBadge>
    </div>
  );
}

function toIndicatorLabel(indicatorType: SLOWithSummaryResponse['indicator']['type']) {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return i18n.translate('xpack.observability.slos.slo.indicator.customKql', {
        defaultMessage: 'KQL',
      });
    case 'sli.apm.transactionDuration':
      return i18n.translate('xpack.observability.slos.slo.indicator.apmLatency', {
        defaultMessage: 'Latency',
      });
    case 'sli.apm.transactionErrorRate':
      return i18n.translate('xpack.observability.slos.slo.indicator.apmAvailability', {
        defaultMessage: 'Availability',
      });
    default:
      assertNever(indicatorType);
  }
}
