/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiNotificationBadge, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { HOST_RISK_SEVERITY_COLOUR, HostRiskScore } from '../common/host_risk_score';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import { SeverityCount } from '../../containers/kpi_hosts/risky_hosts';

export const SeverityBadges: React.FC<{
  severityCount: SeverityCount;
}> = ({ severityCount }) => (
  <EuiFlexGroup
    justifyContent="spaceBetween"
    gutterSize="m"
    data-test-subj="risk-score-severity-badges"
  >
    <EuiFlexItem grow={false} />
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="m">
        {(Object.keys(HOST_RISK_SEVERITY_COLOUR) as HostRiskSeverity[]).map((status) => (
          <EuiFlexItem key={status} grow={false}>
            <SeverityBadge status={status} count={severityCount[status] || 0} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const SeverityBadge: React.FC<{ status: HostRiskSeverity; count: number }> = ({
  status,
  count,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <HostRiskScore severity={status} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiNotificationBadge size="s" color="subdued">
        {count}
      </EuiNotificationBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
