/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const openNoteInExpandableFlyoutClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.OpenNoteInExpandableFlyoutClicked,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID or timeline ID',
        optional: false,
      },
    },
  },
};

export const addNoteFromExpandableFlyoutClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AddNoteFromExpandableFlyoutClicked,
  schema: {
    isRelatedToATimeline: {
      type: 'boolean',
      _meta: {
        description: 'If the note was added related to a saved timeline',
        optional: false,
      },
    },
  },
};
