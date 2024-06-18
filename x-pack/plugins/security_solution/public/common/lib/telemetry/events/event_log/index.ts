/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const eventLogFilterByRunTypeEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EventLogFilterByRunType,
  schema: {
    runType: {
      type: 'keyword',
      _meta: {
        description: 'Filter event log by run type',
        optional: false,
      },
    },
  },
};

export const eventLogShowSourceEventDateRangeEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EventLogShowSourceEventDateRange,
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
