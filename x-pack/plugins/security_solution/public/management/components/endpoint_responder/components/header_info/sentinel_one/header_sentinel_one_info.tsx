/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useGetSentinelOneAgentStatus } from '../../../../../../detections/components/host_isolation/use_sentinelone_host_isolation';
import { SentinelOneAgentStatus } from '../../../../../../detections/components/host_isolation/sentinel_one_agent_status';
import type { ThirdPartyAgentInfo } from '../../../../../../../common/types';
import { HeaderAgentInfo } from '../header_agent_info';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentId: ThirdPartyAgentInfo['agent']['id'];
  platform: ThirdPartyAgentInfo['host']['os']['family'];
  hostName: ThirdPartyAgentInfo['host']['name'];
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(
  ({ agentId, platform, hostName }) => {
    const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
      'sentinelOneManualHostActionsEnabled'
    );
    const { data } = useGetSentinelOneAgentStatus([agentId], { enabled: isSentinelOneV1Enabled });
    const agentStatus = data?.[agentId];
    const lastCheckin = agentStatus ? agentStatus.lastSeen : '';

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
