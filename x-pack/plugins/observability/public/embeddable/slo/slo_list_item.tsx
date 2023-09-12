/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiTitle, EuiPanel } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { SloStatusBadge } from '../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { useFetchHistoricalSummary } from '../../hooks/slo/use_fetch_historical_summary';
import { SloSummary } from './slo_summary';

interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloListItem({ slo }: Props) {
  console.log(slo.name, '!!my slo');
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
  const titleColor = isSloFailed ? 'danger' : '';
  const errorBudgetRemaining =
    slo.summary.errorBudget.remaining <= 0
      ? Math.trunc(slo.summary.errorBudget.remaining * 100) / 100
      : slo.summary.errorBudget.remaining;

  return (
    <EuiPanel paddingSize="m" color="transparent">
      <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="sloList">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>{slo.name}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" responsive={false}>
            <SloStatusBadge slo={slo} />
            <SloActiveAlertsBadge slo={slo} activeAlerts={1} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{slo.summary ? <SloSummary slo={slo} /> : null}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
