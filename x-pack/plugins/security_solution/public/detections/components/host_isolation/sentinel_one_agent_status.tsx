/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { getAgentStatusText } from '../../../common/components/endpoint/agent_status_text';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../management/pages/endpoint_hosts/view/host_constants';
import { useGetSentinelOneAgentStatus } from './use_sentinelone_host_isolation';
import {
  ISOLATED_LABEL,
  ISOLATING_LABEL,
  RELEASING_LABEL,
} from '../../../common/components/endpoint/endpoint_agent_status';

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

export const SentinelOneAgentStatus = React.memo(
  ({ agentId, 'data-test-subj': dataTestSubj }: { agentId: string; 'data-test-subj'?: string }) => {
    const { data, isLoading, isFetched } = useGetSentinelOneAgentStatus([agentId]);
    const agentStatus = data?.[`${agentId}`];

    const label = useMemo(() => {
      const currentNetworkStatus = agentStatus?.isolated;
      const pendingActions = agentStatus?.pendingActions;

      if (pendingActions) {
        if (pendingActions.isolate > 0) {
          return ISOLATING_LABEL;
        }

        if (pendingActions.unisolate > 0) {
          return RELEASING_LABEL;
        }
      }

      if (currentNetworkStatus) {
        return ISOLATED_LABEL;
      }
    }, [agentStatus?.isolated, agentStatus?.pendingActions]);

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
            >
              {getAgentStatusText(agentStatus.status)}
            </EuiBadge>
          ) : (
            '-'
          )}
        </EuiFlexItem>
        {isFetched && !isLoading && label && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
              <>{label}</>
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroupStyled>
    );
  }
);

SentinelOneAgentStatus.displayName = 'SentinelOneAgentStatus';
