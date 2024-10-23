/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TelemetryEventTypes, TelemetryEvent } from './types';

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

const entityInventoryAddDataEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.ENTITY_INVENTORY_ADD_DATA,
  schema: {
    view: {
      type: 'keyword',
      _meta: {
        description:
          'Where the action was initiated (empty_state or add_data_button or add_apm_cta)',
      },
    },
    journey: {
      type: 'keyword',
      _meta: {
        optional: true,
        description:
          'Which action was performed (add_apm_agent or associate_existing_service_logs or collect_new_service_logs)',
      },
    },
  },
};

const tryItClickEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.TRY_IT_CLICK,
  schema: {
    view: {
      type: 'keyword',
      _meta: {
        description:
          'Where the action was initiated (empty_state or add_data_button or add_apm_cta)',
      },
    },
  },
};

const learnMoreClickEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.LEARN_MORE_CLICK,
  schema: {
    view: {
      type: 'keyword',
      _meta: {
        description:
          'Where the action was initiated (empty_state or add_data_button or add_apm_cta)',
      },
    },
  },
};

export const apmTelemetryEventBasedTypes = [
  searchQuerySubmittedEventType,
  entityInventoryAddDataEventType,
  tryItClickEventType,
  learnMoreClickEventType,
];
