/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHealth, EuiNotificationBadge, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';

import {
  AGENT_STATUSES,
  getColorForAgentStatus,
  getLabelForAgentStatus,
} from '../../services/agent_status';
import type { SimplifiedAgentStatus } from '../../../../types';

export const AgentStatusBadges: React.FC<{
  agentStatus: { [k in SimplifiedAgentStatus]: number };
}> = memo(({ agentStatus }) => {
  return (
    <EuiFlexGroup gutterSize="m">
      {AGENT_STATUSES.map((status) => (
        <EuiFlexItem key={status} grow={false}>
          <AgentStatusBadge status={status} count={agentStatus[status] || 0} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

const AgentStatusBadge: React.FC<{ status: SimplifiedAgentStatus; count: number }> = memo(
  ({ status, count }) => {
    return (
      <>
        <EuiHealth color={getColorForAgentStatus(status)}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>{getLabelForAgentStatus(status)}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge size="s" color="subdued">
                {count}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiHealth>
      </>
    );
  }
);
