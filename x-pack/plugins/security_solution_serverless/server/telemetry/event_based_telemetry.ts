/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/analytics-client';

export const NLP_CLEANUP_TASK_EVENT: EventTypeOpts<{
  failedToDeleteCount: number;
  message: string;
  productTier: string;
  totalInstalledCount: number;
}> = {
  eventType: 'nlp_cleanup_task',
  schema: {
    message: {
      type: 'keyword',
      _meta: {
        description:
          'General message from task completion, either summary of task or error message',
      },
    },
    productTier: {
      type: 'keyword',
      _meta: {
        description: 'Current productTier when task was run',
      },
    },
    failedToDeleteCount: {
      type: 'long',
      _meta: {
        description: 'Total number of NLP models failed to be cleaned up',
      },
    },
    totalInstalledCount: {
      type: 'long',
      _meta: {
        description: 'Total number of NLP models deployed when task started',
      },
    },
  },
};

export const telemetryEvents: Array<EventTypeOpts<{ [key: string]: unknown }>> = [
  NLP_CLEANUP_TASK_EVENT,
];
