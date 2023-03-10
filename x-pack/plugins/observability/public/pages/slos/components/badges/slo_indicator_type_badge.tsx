/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { euiLightVars } from '@kbn/ui-theme';

import { toIndicatorTypeLabel } from '../../../../utils/slo/labels';
export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloIndicatorTypeBadge({ slo }: Props) {
  return (
    <div>
      <EuiBadge color={euiLightVars.euiColorDisabled}>
        {toIndicatorTypeLabel(slo.indicator.type)}
      </EuiBadge>
    </div>
  );
}
