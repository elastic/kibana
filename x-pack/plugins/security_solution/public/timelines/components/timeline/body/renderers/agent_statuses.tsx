/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { useHostIsolationStatus } from '../../../../../detections/containers/detection_engine/alerts/use_host_isolation_status';
import { AgentStatus } from '../../../../../common/components/endpoint/agent_status';

export const AgentStatuses = React.memo(
  ({
    fieldName,
    contextId,
    eventId,
    value,
  }: {
    fieldName: string;
    contextId: string;
    eventId: string;
    value: string;
  }) => {
    const { isIsolated, agentStatus } = useHostIsolationStatus({ agentId: value });
    const isolationFieldName = 'host.isolation';
    return (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={fieldName}
            id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
            tooltipContent={fieldName}
            value={`${agentStatus}`}
          >
            <AgentStatus hostStatus={agentStatus} />
          </DefaultDraggable>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={isolationFieldName}
            id={`event-details-value-default-draggable-${contextId}-${eventId}-${isolationFieldName}-${value}`}
            tooltipContent={isolationFieldName}
            value={`${isIsolated}`}
          >
            <EndpointHostIsolationStatus isIsolated={true} />
          </DefaultDraggable>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AgentStatuses.displayName = 'AgentStatuses';
