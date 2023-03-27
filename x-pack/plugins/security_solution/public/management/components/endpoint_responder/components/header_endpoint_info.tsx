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
  EuiText,
  EuiToolTip,
  EuiSpacer,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { EndpointAgentAndIsolationStatus } from '../../endpoint_agent_and_isolation_status';

interface HeaderEndpointInfoProps {
  endpointId: string;
}

export const HeaderEndpointInfo = memo<HeaderEndpointInfoProps>(({ endpointId }) => {
  const { data: endpointDetails, isFetching } = useGetEndpointDetails(endpointId);

  if (isFetching) {
    return <EuiSkeletonText lines={2} />;
  }

  if (!endpointDetails) {
    return null;
  }

  return (
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
            <EndpointAgentAndIsolationStatus
              endpointId={endpointId}
              status={endpointDetails.host_status}
              isIsolated={endpointDetails.metadata.Endpoint.state?.isolation}
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
              date: <FormattedRelative value={endpointDetails.metadata['@timestamp']} />,
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
