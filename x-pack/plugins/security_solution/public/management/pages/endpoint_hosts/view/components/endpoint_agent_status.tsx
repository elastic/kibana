/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { isEndpointHostIsolated } from '../../../../../common/utils/validators';
import type { HostInfo, HostMetadata } from '../../../../../../common/endpoint/types';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
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
  ({ endpointMetadata, hostStatus }) => (
    <EuiFlexGroupStyled gutterSize="none" responsive={false} className="eui-textTruncate">
      <EuiFlexItem grow={false}>
        <AgentStatus hostStatus={hostStatus} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
        <EndpointHostIsolationStatus
          endpointId={endpointMetadata.elastic.agent.id}
          data-test-subj="rowIsolationStatus"
          isIsolated={isEndpointHostIsolated(endpointMetadata)}
        />
      </EuiFlexItem>
    </EuiFlexGroupStyled>
  )
);

EndpointAgentStatus.displayName = 'EndpointAgentStatus';
