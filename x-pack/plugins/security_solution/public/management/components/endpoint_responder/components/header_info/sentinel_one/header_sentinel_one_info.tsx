/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { SentinelOneAgentStatus } from '../../../../../../detections/components/host_isolation/sentinel_one_agent_status';
import type { ThirdPartyAgentInfo } from '../../../../../../../common/types';
import { HeaderAgentInfo } from '../header_agent_info';
import type { Platform } from '../platforms';

interface HeaderSentinelOneInfoProps {
  agentId: ThirdPartyAgentInfo['agent']['id'];
  platform: ThirdPartyAgentInfo['host']['os']['family'];
  hostName: ThirdPartyAgentInfo['host']['name'];
  lastCheckin: ThirdPartyAgentInfo['lastCheckin'];
}

export const HeaderSentinelOneInfo = memo<HeaderSentinelOneInfoProps>(
  ({ agentId, platform, hostName, lastCheckin }) => {
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
