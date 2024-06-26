/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { AgentStatus } from '../../../../../../common/components/endpoint/agents/agent_status';
import { useAgentStatusHook } from '../../../../../hooks/agents/use_get_agent_status';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import type { ThirdPartyAgentInfo } from '../../../../../../../common/types';
import { HeaderAgentInfo } from '../header_agent_info';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentId: ThirdPartyAgentInfo['agent']['id'];
  agentType: ThirdPartyAgentInfo['agent']['type'];
  platform: ThirdPartyAgentInfo['host']['os']['family'];
  hostName: ThirdPartyAgentInfo['host']['name'];
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(
  ({ agentId, agentType, platform, hostName }) => {
    const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
      'sentinelOneManualHostActionsEnabled'
    );
    const getAgentStatus = useAgentStatusHook();
    const { data } = getAgentStatus([agentId], 'sentinel_one', { enabled: isSentinelOneV1Enabled });
    const agentStatus = data?.[agentId];
    const lastCheckin = agentStatus ? agentStatus.lastSeen : '';

    return (
      <HeaderAgentInfo
        platform={platform.toLowerCase() as Platform}
        hostName={hostName}
        lastCheckin={lastCheckin}
      >
        <AgentStatus
          agentId={agentId}
          agentType={agentType}
          data-test-subj="responderHeaderSentinelOneAgentIsolationStatus"
        />
      </HeaderAgentInfo>
    );
  }
);

HeaderSentinelOneInfo.displayName = 'HeaderSentinelOneInfo';
