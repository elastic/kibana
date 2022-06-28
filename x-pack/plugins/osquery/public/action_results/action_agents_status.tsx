/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';

import { AgentStatusBar } from './action_agents_status_bar';
import { ActionAgentsStatusBadges } from './action_agents_status_badges';
import { useActionAgentStatus } from './use_action_agents_status';

interface ActionAgentsStatusProps {
  actionId: string;
  expirationDate?: string;
  agentIds?: string[];
}

const ActionAgentsStatusComponent: React.FC<ActionAgentsStatusProps> = ({
  actionId,
  expirationDate,
  agentIds,
}) => {
  const [isLive, setIsLive] = useState(true);
  const expired = useMemo(
    () => (!expirationDate ? false : new Date(expirationDate) < new Date()),
    [expirationDate]
  );
  const agentStatus = useActionAgentStatus({ actionId, agentIds, skip: !isLive });

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || expired) return false;

        return !!(agentStatus.total !== agentIds?.length);
      }),
    [agentIds?.length, agentStatus.total, expired]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.liveQueryActionResults.summary.agentsQueriedLabelText"
              defaultMessage="Queried {count, plural, one {# agent} other {# agents}}"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ count: agentIds?.length }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ActionAgentsStatusBadges expired={expired} agentStatus={agentStatus} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <AgentStatusBar agentStatus={agentStatus} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const ActionAgentsStatus = React.memo(ActionAgentsStatusComponent);
