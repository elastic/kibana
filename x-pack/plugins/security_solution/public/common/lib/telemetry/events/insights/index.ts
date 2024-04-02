/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../..';
import { TelemetryEventTypes } from '../..';

export const insightsGeneratedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.InsightsGenerated,
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
  },
};
