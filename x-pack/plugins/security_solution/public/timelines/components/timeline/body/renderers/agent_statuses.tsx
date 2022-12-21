/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { useHostIsolationStatus } from '../../../../../detections/containers/detection_engine/alerts/use_host_isolation_status';
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
    const { isIsolated, agentStatus, pendingIsolation, pendingUnisolation } =
      useHostIsolationStatus({ agentId: value });
    return (
      <EuiFlexGroup gutterSize="none">
        {agentStatus !== undefined ? (
          <EuiFlexItem grow={false}>
            <AgentStatus hostStatus={agentStatus} />
          </EuiFlexItem>
        ) : (
          <EuiText>
            <p>{EMPTY_STATUS}</p>
          </EuiText>
        )}
        <EuiFlexItem grow={false}>
          <EndpointHostIsolationStatus
            isIsolated={isIsolated}
            pendingActions={{
              pendingIsolate: pendingIsolation,
              pendingUnIsolate: pendingUnisolation,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AgentStatuses.displayName = 'AgentStatuses';
