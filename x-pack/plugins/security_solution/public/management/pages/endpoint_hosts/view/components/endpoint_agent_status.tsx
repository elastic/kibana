/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import type { HostInfo, HostMetadata } from '../../../../../../common/endpoint/types';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { useEndpointSelector } from '../hooks';
import { getEndpointHostIsolationStatusPropsCallback } from '../../store/selectors';
import { AgentStatus } from '../../../../../common/components/endpoint/agent_status';

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export interface EndpointAgentStatusProps {
  hostStatus: HostInfo['host_status'];
  endpointMetadata: HostMetadata;
}
export const EndpointAgentStatus = memo<EndpointAgentStatusProps>(
  ({ endpointMetadata, hostStatus }) => {
    const getEndpointIsolationStatusProps = useEndpointSelector(
      getEndpointHostIsolationStatusPropsCallback
    );

    return (
      <EuiFlexGroupStyled gutterSize="none" responsive={false} className="eui-textTruncate">
        <EuiFlexItem grow={false}>
          <AgentStatus hostStatus={hostStatus} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
          <EndpointHostIsolationStatus
            data-test-subj="rowIsolationStatus"
            {...getEndpointIsolationStatusProps(endpointMetadata)}
          />
        </EuiFlexItem>
      </EuiFlexGroupStyled>
    );
  }
);

EndpointAgentStatus.displayName = 'EndpointAgentStatus';
