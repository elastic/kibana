/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { useGetSentinelOneDetails } from '../../../../../hooks/sentinel_one/use_get_sentinel_one_details';
import { HeaderAgentInfo } from '../header_agent_info';
import { useGetEndpointPendingActionsSummary } from '../../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentId: string;
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(({ agentId }) => {
  const { data: sentinelOneDetails, isFetching } = useGetSentinelOneDetails(agentId, {
    refetchInterval: 10000,
  });

  // fetch pending actions using the agent id and action status API
  const { data: agentPendingActions } = useGetEndpointPendingActionsSummary([agentId], {
    refetchInterval: 10000,
  });

  if (isFetching && agentPendingActions === undefined) {
    return <EuiSkeletonText lines={2} />;
  }

  if (!sentinelOneDetails) {
    return null;
  }

  return (
    <HeaderAgentInfo
      platform={sentinelOneDetails.os.name.toLowerCase() as Platform}
      hostName={sentinelOneDetails.host.name}
      lastCheckin={sentinelOneDetails.last_checkin}
    >
      {/* TODO: Update with a SentinelOne agent isolation status component */}
      {/* <SentinelOneAgentStatus
        sentinelOneHostInfo={sentinelOneDetails}
        data-test-subj="responderHeaderSentinelOneAgentIsolationStatus"
      /> */}
    </HeaderAgentInfo>
  );
});

HeaderSentinelOneInfo.displayName = 'HeaderSentinelOneInfo';
