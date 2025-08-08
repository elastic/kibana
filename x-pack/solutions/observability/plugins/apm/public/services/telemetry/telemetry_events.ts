/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryEvent } from './types';
import { TelemetryEventTypes } from './types';

const searchQuerySubmittedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SEARCH_QUERY_SUBMITTED,
  schema: {
    kueryFields: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'The kuery fields used in the search',
        },
      },
    },
    timerange: {
      type: 'text',
      _meta: {
        description: 'The timerange of the search',
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'The action performed (e.g., submit, refresh)',
      },
    },
  },
};

const agentConfigurationChangedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.AGENT_CONFIGURATION_CHANGED,
  schema: {
    agentName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the agent (e.g., java, nodejs, all)',
      },
    },
    environment: {
      type: 'keyword',
      _meta: {
        description: 'The environment for which the agent configuration was changed or all',
      },
    },
    predefinedSettings: {
      type: 'array',
      items: {
        properties: {
          key: {
            type: 'keyword',
            _meta: {
              description: 'The key of the predefined setting that was changed',
            },
          },
          value: {
            type: 'keyword',
            _meta: {
              description: 'The value of the predefined setting that was changed',
            },
          },
        },
      },
    },
    advancedSettings: {
      type: 'array',
      items: {
        properties: {
          key: {
            type: 'keyword',
            _meta: {
              description: 'The key of the predefined setting that was changed',
            },
          },
          value: {
            type: 'keyword',
            _meta: {
              description: 'The value of the predefined setting that was changed',
            },
          },
        },
      },
    },
  },
};

export const apmTelemetryEventBasedTypes = [
  searchQuerySubmittedEventType,
  agentConfigurationChangedEventType,
];
