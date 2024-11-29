/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TelemetryEventTypes, TelemetryEvent } from './types';

const inventoryAddDataEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.INVENTORY_ADD_DATA_CLICKED,
  schema: {
    view: {
      type: 'keyword',
      _meta: {
        description: 'Where the action was initiated (add_data_button)',
      },
    },
    journey: {
      type: 'keyword',
      _meta: {
        optional: true,
        description: 'Which action was performed (add_data or associate_existing_service_logs)',
      },
    },
  },
};

const entityInventoryViewedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.ENTITY_INVENTORY_VIEWED,
  schema: {
    view_state: {
      type: 'keyword',
      _meta: {
        description: 'State of the view: empty, populated or eem_disabled.',
      },
    },
  },
};

const searchQuerySubmittedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.ENTITY_INVENTORY_SEARCH_QUERY_SUBMITTED,
  schema: {
    kuery_fields: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'Kuery fields used in the search.',
        },
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'Action performed: submit or refresh.',
      },
    },
  },
};

const entityViewClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.ENTITY_VIEW_CLICKED,
  schema: {
    entity_type: {
      type: 'keyword',
      _meta: {
        description: 'Type of the entity: container, host or service.',
      },
    },
    view_type: {
      type: 'keyword',
      _meta: {
        description: 'Type of the view: detail or flyout.',
      },
    },
  },
};

export const inventoryTelemetryEventBasedTypes = [
  inventoryAddDataEventType,
  entityInventoryViewedEventType,
  searchQuerySubmittedEventType,
  entityViewClickedEventType,
];
