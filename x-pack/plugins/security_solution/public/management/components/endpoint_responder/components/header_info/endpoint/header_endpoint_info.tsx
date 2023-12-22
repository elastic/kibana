/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { HeaderAgentInfo } from '../header_agent_info';
import { useGetEndpointDetails } from '../../../../../hooks';
import { useGetEndpointPendingActionsSummary } from '../../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import type { Platform } from '../platforms';

const IconContainer = euiStyled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface HeaderEndpointInfoProps {
  endpointId: string;
}

export const HeaderEndpointInfo = memo<HeaderEndpointInfoProps>(({ endpointId }) => {
  const { data: endpointDetails, isFetching } = useGetEndpointDetails(endpointId, {
    refetchInterval: 10000,
  });
  const { data: endpointPendingActions } = useGetEndpointPendingActionsSummary([endpointId], {
    refetchInterval: 10000,
  });

  if (isFetching && endpointPendingActions === undefined) {
    return <EuiSkeletonText lines={2} />;
  }

  if (!endpointDetails) {
    return null;
  }

  return (
    <HeaderAgentInfo
      endpointDetails={endpointDetails}
      platform={endpointDetails.metadata.host.os.name.toLowerCase() as Platform}
      hostName={endpointDetails.metadata.host.name}
      lastCheckin={endpointDetails.last_checkin}
    />
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
