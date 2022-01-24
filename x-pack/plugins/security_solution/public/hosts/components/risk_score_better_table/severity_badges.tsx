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
import { DefaultDraggable } from '../../../common/components/draggables';

export const SeverityBadges: React.FC<{
  severity: { [k in HostRiskSeverity]: number };
}> = ({ severity }) => (
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
            <SeverityBadge status={status} count={severity[status] || 0} />
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
      <DefaultDraggable
        id={`severity-badge-draggable-risk-${status}`}
        isDraggable={false}
        field={'risk.keyword'}
        value={status}
        hideTopN={true}
        tooltipContent={null}
      >
        <HostRiskScore severity={status} />
      </DefaultDraggable>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiNotificationBadge size="s" color="subdued">
        {count}
      </EuiNotificationBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
