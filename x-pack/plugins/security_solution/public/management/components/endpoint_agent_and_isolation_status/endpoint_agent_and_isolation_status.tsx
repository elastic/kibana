/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type { HostStatus } from '../../../../common/endpoint/types';
import { AgentStatus } from '../../../common/components/endpoint/agent_status';
import type { EndpointHostIsolationStatusProps } from '../../../common/components/endpoint/host_isolation';
import { EndpointHostIsolationStatus } from '../../../common/components/endpoint/host_isolation';

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export interface EndpointAgentAndIsolationStatusProps
  extends Pick<EndpointHostIsolationStatusProps, 'pendingActions'> {
  status: HostStatus;
  /**
   * If defined with a boolean, then the isolation status will be shown along with the agent status.
   * The `pendingIsolate` and `pendingUnIsolate` props will only be used when this prop is set to a
   * `boolean`
   */
  isIsolated?: boolean;
  'data-test-subj'?: string;
}

export const EndpointAgentAndIsolationStatus = memo<EndpointAgentAndIsolationStatusProps>(
  ({ status, isIsolated, pendingActions, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <EuiFlexGroupStyled
        gutterSize="none"
        responsive={false}
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <AgentStatus hostStatus={status} />
        </EuiFlexItem>
        {isIsolated !== undefined && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <EndpointHostIsolationStatus
              data-test-subj={getTestId('isolationStatus')}
              isIsolated={isIsolated}
              pendingActions={pendingActions}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroupStyled>
    );
  }
);
EndpointAgentAndIsolationStatus.displayName = 'EndpointAgentAndIsolationStatus';
