/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloForecastedBadge({ slo }: Props) {
  if (!slo.summary.errorBudget.isEstimated) {
    return null;
  }

  return (
    <div>
      <EuiBadge color={euiLightVars.euiColorDisabled}>
        {i18n.translate('xpack.observability.slos.slo.state.forecasted', {
          defaultMessage: 'Forecasted',
        })}
      </EuiBadge>
    </div>
  );
}
