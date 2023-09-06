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
    kuery_fields: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: '',
        },
      },
    },
    interval: {
      type: 'text',
      _meta: {
        description: 'The interval of the search',
      },
    },
    action: {
      type: 'text',
      _meta: {
        description: 'Which action perfomed. Sumitted, refresh update',
      },
    },
  },
};

export const apmTelemetryEventBasedTypes = [searchQuerySubmittedEventType];
