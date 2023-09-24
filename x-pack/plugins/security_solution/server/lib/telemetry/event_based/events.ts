/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/analytics-client';

export const RISK_SCORE_EXECUTION_SUCESS_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskCompletionTimeSeconds: number;
  isRunMoreThanInteval: boolean;
}> = {
  eventType: 'risk_score_execution_success',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Amount of written scores',
      },
    },
    taskCompletionTimeSeconds: {
      type: 'long',
      _meta: {
        description: 'Time for task comletion in seconds',
      },
    },
    isRunMoreThanInteval: {
      type: 'boolean',
      _meta: {
        description: 'If execution time is more than interval',
      },
    },
  },
};

export const RISK_SCORE_EXECUTION_ERROR_EVENT: EventTypeOpts<{}> = {
  eventType: 'risk_score_execution_error',
  schema: {},
};

export const events = [RISK_SCORE_EXECUTION_SUCESS_EVENT, RISK_SCORE_EXECUTION_ERROR_EVENT];
