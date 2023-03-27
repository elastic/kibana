/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { isEndpointHostIsolated } from '../../../../../common/utils/validators';
import { useGetEndpointDetails } from '../../../../../management/hooks';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { AgentStatus } from '../../../../../common/components/endpoint/agent_status';
import { EMPTY_STATUS } from './translations';

export const AgentStatuses = React.memo(
  ({
    fieldName,
    contextId,
    eventId,
    fieldType,
    isAggregatable,
    isDraggable,
    value,
  }: {
    fieldName: string;
    fieldType: string;
    contextId: string;
    eventId: string;
    isAggregatable: boolean;
    isDraggable: boolean;
    value: string;
  }) => {
    const { data: hostDetails } = useGetEndpointDetails(value);

    return (
      <EuiFlexGroup gutterSize="none">
        {hostDetails?.agentStatus !== undefined ? (
          <EuiFlexItem grow={false}>
            <AgentStatus hostStatus={hostDetails?.agentStatus} />
          </EuiFlexItem>
        ) : (
          <EuiText>
            <p>{EMPTY_STATUS}</p>
          </EuiText>
        )}
        <EuiFlexItem grow={false}>
          <EndpointHostIsolationStatus
            endpointId={value}
            isIsolated={
              hostDetails?.metadata ? isEndpointHostIsolated(hostDetails?.metadata) : false
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AgentStatuses.displayName = 'AgentStatuses';
