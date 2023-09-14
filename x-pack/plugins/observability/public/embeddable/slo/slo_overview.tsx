/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiPanel } from '@elastic/eui';
import { SloStatusBadge } from '../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { SloSummary } from './slo_summary';
import { EmbeddableSloProps } from './types';

export function SloOverview({ slo }: EmbeddableSloProps) {
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
