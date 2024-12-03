/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLogTelemetryEvent } from './types';
import { EventLogEventTypes } from './types';

export const eventLogFilterByRunTypeEvent: EventLogTelemetryEvent = {
  eventType: EventLogEventTypes.EventLogFilterByRunType,
  schema: {
    runType: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Filter event log by run type',
        },
      },
    },
  },
};

export const eventLogShowSourceEventDateRangeEvent: EventLogTelemetryEvent = {
  eventType: EventLogEventTypes.EventLogShowSourceEventDateRange,
  schema: {
    isVisible: {
      type: 'boolean',
      _meta: {
        description: 'Show source event date range',
        optional: false,
      },
    },
  },
};

export const eventLogTelemetryEvents = [
  eventLogFilterByRunTypeEvent,
  eventLogShowSourceEventDateRangeEvent,
];
