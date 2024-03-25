/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { HostStatus } from '../../../../common/endpoint/types';
import { getAgentStatusText } from '../../../common/components/endpoint/agent_status_text';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../management/pages/endpoint_hosts/view/host_constants';
// import { useGetCrowdstrikeAgentStatus } from './use_crowdstrike_host_isolation';
import {
  ISOLATED_LABEL,
  ISOLATING_LABEL,
  RELEASING_LABEL,
} from '../../../common/components/endpoint/endpoint_agent_status';

export enum CROWDSTRIKE_NETWORK_STATUS {
  NORMAL = 'normal',
  CONTAINED = 'contained',
}

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

// TODO TC: THIS IS JUST A PLACEHOLDER UNTIL THE ACTUAL CROWDSTRIKE STATUS IS AVAILABLE - waiting for https://github.com/elastic/kibana/pull/178625
export const CrowdstrikeAgentStatus = React.memo(
  ({ agentId, 'data-test-subj': dataTestSubj }: { agentId: string; 'data-test-subj'?: string }) => {
    // const { data, isLoading, isFetched } = useGetCrowdstrikeAgentStatus([agentId]);
    const agentStatus = {
      status: HostStatus.HEALTHY,
      isolated: true,
      pendingActions: { isolate: 1, unisolate: 0 },
    };
    // const agentStatus = data?.[`${agentId}`];

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
          {agentStatus ? (
            // {isFetched && !isLoading && agentStatus ? (
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
        {label && (
          // {isFetched && !isLoading && label && (
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

CrowdstrikeAgentStatus.displayName = 'crowdstrikeAgentStatus';
