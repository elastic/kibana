/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DefaultDraggable } from '../../../common/components/draggables';
import { FormattedDuration } from '../formatted_duration';

export const EVENT_DURATION_FIELD_NAME = 'event.duration';

/**
 * Renders draggable text containing the value of a field representing a
 * duration of time, (e.g. `event.duration`)
 */
export const Duration = React.memo<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value?: string | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DefaultDraggable
    id={`duration-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
    // @ts-expect-error
    name={name}
    field={fieldName}
    tooltipContent={null}
    value={value}
  >
    <FormattedDuration maybeDurationNanoseconds={value} tooltipTitle={fieldName} />
  </DefaultDraggable>
));

Duration.displayName = 'Duration';
