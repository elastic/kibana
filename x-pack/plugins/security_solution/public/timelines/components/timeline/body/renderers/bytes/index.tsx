/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DefaultDraggable } from '../../../../../../common/components/draggables';
import { PreferenceFormattedBytes } from '../../../../../../common/components/formatted_bytes';

export const BYTES_FORMAT = 'bytes';

/**
 * Renders draggable text containing the value of a field representing a
 * duration of time, (e.g. `event.duration`)
 */
export const Bytes = React.memo<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value?: string | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DefaultDraggable
    id={`bytes-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
    name={name}
    field={fieldName}
    tooltipContent={null}
    value={value}
  >
    <PreferenceFormattedBytes value={`${value}`} />
  </DefaultDraggable>
));

Bytes.displayName = 'Bytes';
