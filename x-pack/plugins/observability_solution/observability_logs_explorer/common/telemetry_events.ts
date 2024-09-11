/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EventTypeOpts } from '@elastic/ebt/client';

export const DATA_RECEIVED_TELEMETRY_EVENT: EventTypeOpts<{
  rowCount: number;
  selectedIntegrationName?: string;
}> = {
  eventType: 'logs_explorer_data_received',
  schema: {
    rowCount: {
      type: 'integer',
      _meta: {
        description:
          'Number of data rows loaded by the logs explorer. 0 row count is not reported.',
      },
    },
    selectedIntegrationName: {
      type: 'keyword',
      _meta: {
        description: 'Name of the integration that user has selected to filter logs by.',
        optional: true,
      },
    },
  },
};
