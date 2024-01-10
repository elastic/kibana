/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { SentinelOneAgentStatus } from '../../../../../../detections/components/host_isolation/sentinel_one_agent_status';
import type { ThirdPartyAgentInfo } from '../../../../../../../common/types';
import { HeaderAgentInfo } from '../header_agent_info';
import { useGetEndpointPendingActionsSummary } from '../../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentId: ThirdPartyAgentInfo['agent']['id'];
  platform: ThirdPartyAgentInfo['host']['os']['family'];
  hostName: ThirdPartyAgentInfo['host']['name'];
  lastCheckin: ThirdPartyAgentInfo['lastCheckin'];
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(
  ({ agentId, platform, hostName, lastCheckin }) => {
    // fetch pending actions using the agent id and action status API
    const { data: agentPendingActions, isFetching } = useGetEndpointPendingActionsSummary(
      [agentId],
      {
        refetchInterval: 10000,
      }
    );

    if (isFetching && agentPendingActions === undefined) {
      return <EuiSkeletonText lines={2} />;
    }

    return (
      <HeaderAgentInfo
        platform={platform.toLowerCase() as Platform}
        hostName={hostName}
        lastCheckin={lastCheckin}
      >
        <SentinelOneAgentStatus
          agentId={agentId}
          data-test-subj="responderHeaderSentinelOneAgentIsolationStatus"
        />
      </HeaderAgentInfo>
    );
  }
);

HeaderSentinelOneInfo.displayName = 'HeaderSentinelOneInfo';
