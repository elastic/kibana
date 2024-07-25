/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, EventTypeOpts, RootSchema } from '@kbn/core/public';

import { EventType, FieldType } from './event_tracker';

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.SPACE_ID]: {
    [FieldType.SPACE_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the space.',
      },
    },
  },
  [FieldType.SOLUTION_NEXT]: {
    [FieldType.SOLUTION_NEXT]: {
      type: 'keyword',
      _meta: {
        description: 'The solution set for the space.',
      },
    },
  },
  [FieldType.SOLUTION_PREV]: {
    [FieldType.SOLUTION_PREV]: {
      type: 'keyword',
      _meta: {
        description: 'The previous solution value before editing the space.',
      },
    },
  },
};

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventType.SPACE_CREATED,
    schema: {
      ...fields[FieldType.SPACE_ID],
      ...fields[FieldType.SOLUTION_NEXT],
    },
  },
  {
    eventType: EventType.SPACE_EDITED,
    schema: {
      ...fields[FieldType.SPACE_ID],
      ...fields[FieldType.SOLUTION_PREV],
      ...fields[FieldType.SOLUTION_NEXT],
    },
  },
];

export function registerSpacesEventTypes(core: CoreSetup) {
  const { analytics } = core;
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
}
