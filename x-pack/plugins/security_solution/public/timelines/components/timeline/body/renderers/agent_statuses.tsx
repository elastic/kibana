/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DefaultDraggable } from '../../../../../common/components/draggables';

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
    value: string | number | undefined | null;
  }) => {
    const agentStatuses = `${value}`;
    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        tooltipContent={fieldName}
        value={agentStatuses}
      />
    );
  }
);

AgentStatuses.displayName = 'AgentStatuses';
