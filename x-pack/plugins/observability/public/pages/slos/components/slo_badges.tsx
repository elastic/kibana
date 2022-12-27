/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { SLO } from '../../../typings';
import { SloStatusBadge } from './slo_status_badge';
import { SloForecastedBadge } from './slo_forecasted_badge';

export interface Props {
  slo: SLO;
}

export function SloBadges({ slo }: Props) {
  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="m">
      <EuiFlexItem grow={false}>
        <SloStatusBadge slo={slo} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SloForecastedBadge slo={slo} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
