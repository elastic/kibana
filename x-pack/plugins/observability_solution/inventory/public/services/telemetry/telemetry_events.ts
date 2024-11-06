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

export const inventoryTelemetryEventBasedTypes = [inventoryAddDataEventType];
