/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetEndpointDetails } from '../../../hooks';
import { EndpointAgentAndIsolationStatus } from '../../endpoint_agent_and_isolation_status';
import { HOST_STATUS_TO_HEALTH_COLOR } from '../../../pages/endpoint_hosts/view/host_constants';

interface HeaderEndpointInfoProps {
  endpointId: string;
}

export const HeaderEndpointInfo = memo<HeaderEndpointInfoProps>(({ endpointId }) => {
  const { data: endpointDetails } = useGetEndpointDetails(endpointId, { refetchInterval: 10000 });

  if (!endpointDetails) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiHealth
          color={HOST_STATUS_TO_HEALTH_COLOR[endpointDetails.host_status]}
          data-test-subj="consoleHeaderEndpointHealth"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <h6>
            <FormattedMessage
              id="xpack.securitySolution.console.header.endpointTitle"
              defaultMessage="ENDPOINT"
            />
          </h6>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="success" size="s">
          <h6>{endpointDetails.metadata.host.name}</h6>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EndpointAgentAndIsolationStatus
          status={endpointDetails.host_status}
          isIsolated={endpointDetails.metadata.Endpoint.state?.isolation}
          // pendingIsolate={}
          // pendingUnIsolate={}
          data-test-subj="consoleHeaderEndpointIsolationStatus"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
