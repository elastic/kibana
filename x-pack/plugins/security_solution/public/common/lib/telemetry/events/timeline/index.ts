/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const timelineFullScreenClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelineFullScreenClicked,
  schema: {
    timelineId: {
      type: 'keyword',
      _meta: {
        description: 'Timeline id (active, case or test)',
        optional: false,
      },
    },
    tab: {
      type: 'keyword',
      _meta: {
        description: 'Timeline tab (query, esql, pinned...)',
        optional: false,
      },
    },
  },
};
