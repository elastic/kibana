/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { SentinelOneAgent } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { getAgentStatusText } from '../../../common/components/endpoint/agent_status_text';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../management/pages/endpoint_hosts/view/host_constants';
import { useSentinelOneAgentData } from './use_sentinelone_host_isolation';
import {
  ISOLATING_LABEL,
  ISOLATED_LABEL,
  RELEASING_LABEL,
} from '../../../common/components/endpoint/endpoint_agent_status';

const getSentinelOneAgentStatus = (data?: SentinelOneAgent) => {
  if (!data) {
    return HostStatus.UNENROLLED;
  }

  if (!data?.isActive) {
    return HostStatus.OFFLINE;
  }

  return HostStatus.HEALTHY;
};

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
    const { data, isFetched } = useSentinelOneAgentData({ agentId });

    const label = useMemo(() => {
      const networkStatus = data?.data?.data?.[0]?.networkStatus;

      if (networkStatus === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTING) {
        return ISOLATING_LABEL;
      }

      if (networkStatus === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTED) {
        return ISOLATED_LABEL;
      }

      if (networkStatus === SENTINEL_ONE_NETWORK_STATUS.CONNECTING) {
        return RELEASING_LABEL;
      }
    }, [data?.data?.data]);

    const agentStatus = useMemo(() => getSentinelOneAgentStatus(data?.data?.data?.[0]), [data]);

    return (
      <EuiFlexGroupStyled
        gutterSize="none"
        responsive={false}
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          {isFetched ? (
            <EuiBadge color={HOST_STATUS_TO_BADGE_COLOR[agentStatus]} className="eui-textTruncate">
              {getAgentStatusText(agentStatus)}
            </EuiBadge>
          ) : (
            '-'
          )}
        </EuiFlexItem>
        {label && (
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
