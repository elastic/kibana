/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { DefaultDraggable } from '../draggables';
import { FormattedDuration } from '../formatted_duration';

export const EVENT_DURATION_FIELD_NAME = 'event.duration';

/**
 * Renders draggable text containing the value of a field representing a
 * duration of time, (e.g. `event.duration`)
 */
export const Duration = pure<{
  contextId: string;
  eventId: string;
  fieldName: string;
  value?: string | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DefaultDraggable
    id={`${contextId}-${eventId}-${fieldName}-${value}`}
    name={name}
    field={fieldName}
    tooltipContent={null}
    value={value}
  >
    <FormattedDuration maybeDurationNanoseconds={value} tooltipTitle={fieldName} />
  </DefaultDraggable>
));
