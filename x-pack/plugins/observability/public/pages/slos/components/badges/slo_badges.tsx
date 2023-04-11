/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';
import type { ActiveAlerts } from '../../../../hooks/slo/use_fetch_active_alerts';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';

export interface Props {
  slo: SLOWithSummaryResponse;
  activeAlerts?: ActiveAlerts;
}

export function SloBadges({ slo, activeAlerts }: Props) {
  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
      <SloStatusBadge slo={slo} />
      <SloIndicatorTypeBadge slo={slo} />
      <SloTimeWindowBadge slo={slo} />
      <SloActiveAlertsBadge activeAlerts={activeAlerts} />
    </EuiFlexGroup>
  );
}
