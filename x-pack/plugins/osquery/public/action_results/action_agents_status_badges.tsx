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
} from './services/agent_status';
import { ActionAgentStatus } from './types';

export const ActionAgentsStatusBadges = memo<{
  agentStatus: { [k in ActionAgentStatus]: number };
  expired: boolean;
}>(({ agentStatus, expired }) => (
  <EuiFlexGroup gutterSize="m">
    {AGENT_STATUSES.map((status) => (
      <EuiFlexItem key={status} grow={false}>
        <AgentStatusBadge expired={expired} status={status} count={agentStatus[status] || 0} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));

ActionAgentsStatusBadges.displayName = 'ActionAgentsStatusBadges';

const AgentStatusBadge = memo<{ expired: boolean; status: ActionAgentStatus; count: number }>(
  ({ expired, status, count }) => (
    <>
      <EuiHealth color={getColorForAgentStatus(status)}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{getLabelForAgentStatus(status, expired)}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge size="s" color="subdued">
              {count}
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHealth>
    </>
  )
);

AgentStatusBadge.displayName = 'AgentStatusBadge';
