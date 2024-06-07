/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointPendingActions } from '../../../../../../common/endpoint/types';
import { useAgentStatusHook } from '../../../../../management/hooks/agents/use_get_agent_status';
import { useTestIdGenerator } from '../../../../../management/hooks/use_test_id_generator';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../../../management/pages/endpoint_hosts/view/host_constants';
import { useIsExperimentalFeatureEnabled } from '../../../../hooks/use_experimental_features';
import { getAgentStatusText } from '../agent_status_text';
import { AgentResponseActionsStatus } from './agent_response_action_status';
export enum SENTINEL_ONE_NETWORK_STATUS {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
}

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export const AgentStatus = React.memo(
  ({
    agentId,
    agentType,
    'data-test-subj': dataTestSubj,
  }: {
    agentId: string;
    agentType: ResponseActionAgentType;
    'data-test-subj'?: string;
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const useAgentStatus = useAgentStatusHook();

    const sentinelOneManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
      'sentinelOneManualHostActionsEnabled'
    );
    const responseActionsCrowdstrikeManualHostIsolationEnabled = useIsExperimentalFeatureEnabled(
      'responseActionsCrowdstrikeManualHostIsolationEnabled'
    );
    const { data, isLoading, isFetched } = useAgentStatus([agentId], agentType, {
      enabled:
        sentinelOneManualHostActionsEnabled || responseActionsCrowdstrikeManualHostIsolationEnabled,
    });
    const agentStatus = data?.[`${agentId}`];
    const isCurrentlyIsolated = Boolean(agentStatus?.isolated);
    const pendingActions = agentStatus?.pendingActions;

    const [hasPendingActions, hostPendingActions] = useMemo<
      [boolean, EndpointPendingActions['pending_actions']]
    >(() => {
      if (!pendingActions) {
        return [false, {}];
      }

      return [Object.keys(pendingActions).length > 0, pendingActions];
    }, [pendingActions]);

    return (
      <EuiFlexGroupStyled
        gutterSize="none"
        responsive={false}
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          {isFetched && !isLoading && agentStatus ? (
            <EuiBadge
              color={HOST_STATUS_TO_BADGE_COLOR[agentStatus.status]}
              className="eui-textTruncate"
              data-test-subj={getTestId('agentStatus')}
            >
              {getAgentStatusText(agentStatus.status)}
            </EuiBadge>
          ) : (
            '-'
          )}
        </EuiFlexItem>
        {(isCurrentlyIsolated || hasPendingActions) && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <AgentResponseActionsStatus
              data-test-subj={getTestId('actionStatuses')}
              isIsolated={isCurrentlyIsolated}
              pendingActions={hostPendingActions}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroupStyled>
    );
  }
);

AgentStatus.displayName = 'AgentStatus';
