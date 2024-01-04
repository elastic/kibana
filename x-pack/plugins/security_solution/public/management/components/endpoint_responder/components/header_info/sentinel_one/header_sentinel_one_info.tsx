/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { SentinelOneAgentInfo } from '../../../../../../../common/types';
import { HeaderAgentInfo } from '../header_agent_info';
import { useGetEndpointPendingActionsSummary } from '../../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentInfo: SentinelOneAgentInfo;
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(({ agentInfo }) => {
  // fetch pending actions using the agent id and action status API
  const { data: agentPendingActions, isFetching } = useGetEndpointPendingActionsSummary(
    [agentInfo.agent.id],
    {
      refetchInterval: 10000,
    }
  );

  if (isFetching && agentPendingActions === undefined) {
    return <EuiSkeletonText lines={2} />;
  }

  return (
    <HeaderAgentInfo
      platform={agentInfo.os.name.toLowerCase() as Platform}
      hostName={agentInfo.host.name}
      lastCheckin={agentInfo.last_checkin}
    >
      {/* TODO: Update with a SentinelOne agent isolation status component */}
      {/* <SentinelOneAgentStatus
        sentinelOneHostInfo={agentInfo}
        data-test-subj="responderHeaderSentinelOneAgentIsolationStatus"
      /> */}
    </HeaderAgentInfo>
  );
});

HeaderSentinelOneInfo.displayName = 'HeaderSentinelOneInfo';
