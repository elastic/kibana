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

export const apmTelemetryEventBasedTypes = [searchQuerySubmittedEventType];
