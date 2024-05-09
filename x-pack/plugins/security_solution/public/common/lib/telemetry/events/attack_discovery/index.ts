/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const insightsGeneratedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AttackDiscoveriesGenerated,
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'Duration of request in ms',
        optional: false,
      },
    },
    alertsContextCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts sent as context to the LLM',
        optional: false,
      },
    },
    alertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of unique alerts referenced in the attack discoveries',
        optional: false,
      },
    },
    configuredAlertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts configured by the user',
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
