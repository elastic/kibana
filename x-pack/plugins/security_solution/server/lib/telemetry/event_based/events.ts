/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/analytics-client';

export const RISK_SCORE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskDurationInSeconds: number;
  executionDurationExceededInterval: boolean;
}> = {
  eventType: 'risk_score_execution_success',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Number of risk scores written during this scoring task execution',
      },
    },
    taskDurationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the current risk scoring task execution',
      },
    },
    executionDurationExceededInterval: {
      type: 'boolean',
      _meta: {
        description: `Whether the risk scoring task's duration exceeded its allocated interval`,
      },
    },
  },
};

export const RISK_SCORE_EXECUTION_ERROR_EVENT: EventTypeOpts<{}> = {
  eventType: 'risk_score_execution_error',
  schema: {},
};

export const events = [RISK_SCORE_EXECUTION_SUCCESS_EVENT, RISK_SCORE_EXECUTION_ERROR_EVENT];
