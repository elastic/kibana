/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { useHostIsolationStatus } from '../../../../../detections/containers/detection_engine/alerts/use_host_isolation_status';
import { AgentStatus } from '../../../../../common/components/endpoint/agent_status';
import { EMPTY_STATUS } from './translations';

export const AgentStatuses = React.memo(
  ({
    fieldName,
    contextId,
    eventId,
    isDraggable,
    value,
  }: {
    fieldName: string;
    contextId: string;
    eventId: string;
    isDraggable: boolean;
    value: string;
  }) => {
    const { isIsolated, agentStatus, pendingIsolation, pendingUnisolation } =
      useHostIsolationStatus({ agentId: value });
    const isolationFieldName = 'host.isolation';
    return (
      <EuiFlexGroup gutterSize="none">
        {agentStatus !== undefined ? (
          <EuiFlexItem grow={false}>
            {isDraggable ? (
              <DefaultDraggable
                field={fieldName}
                id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
                isDraggable={isDraggable}
                tooltipContent={fieldName}
                value={`${agentStatus}`}
              >
                <AgentStatus hostStatus={agentStatus} />
              </DefaultDraggable>
            ) : (
              <AgentStatus hostStatus={agentStatus} />
            )}
          </EuiFlexItem>
        ) : (
          <EuiText>
            <p>{EMPTY_STATUS}</p>
          </EuiText>
        )}
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={isolationFieldName}
            id={`event-details-value-default-draggable-${contextId}-${eventId}-${isolationFieldName}-${value}`}
            isDraggable={isDraggable}
            tooltipContent={isolationFieldName}
            value={`${isIsolated}`}
          >
            <EndpointHostIsolationStatus
              isIsolated={isIsolated}
              pendingIsolate={pendingIsolation}
              pendingUnIsolate={pendingUnisolation}
            />
          </DefaultDraggable>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AgentStatuses.displayName = 'AgentStatuses';
