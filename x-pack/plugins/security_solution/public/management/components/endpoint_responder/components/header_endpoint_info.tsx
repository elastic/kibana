/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { EndpointAgentStatus } from '../../../../common/components/endpoint/endpoint_agent_status';
import { useGetEndpointPendingActionsSummary } from '../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import type { Platform } from './platforms';
import { PlatformIcon } from './platforms';

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
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <IconContainer>
          <PlatformIcon
            data-test-subj="responderHeaderEndpointPlatformIcon"
            platform={endpointDetails.metadata.host.os.name.toLowerCase() as Platform}
          />
        </IconContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiToolTip
                  content={endpointDetails.metadata.host.name}
                  anchorClassName="eui-textTruncate"
                >
                  <EuiText size="s" data-test-subj="responderHeaderEndpointName">
                    <h6 className="eui-textTruncate">{endpointDetails.metadata.host.name}</h6>
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EndpointAgentStatus
                  endpointHostInfo={endpointDetails}
                  data-test-subj="responderHeaderEndpointAgentIsolationStatus"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xs" />
            <EuiText color="subdued" size="s" data-test-subj="responderHeaderLastSeen">
              <FormattedMessage
                id="xpack.securitySolution.responder.header.lastSeen"
                defaultMessage="Last seen {date}"
                values={{
                  date: <FormattedRelative value={endpointDetails.last_checkin} />,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
