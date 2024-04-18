/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { ExtendedTimeRange, LogStreamQueryContext, ParsedQuery, Timestamps } from './types';

export interface TimeChangedEvent {
  type: 'TIME_CHANGED';
  timeRange: ExtendedTimeRange;
  refreshInterval: RefreshInterval;
  timestamps: Timestamps;
}

export type LogStreamQueryNotificationEvent =
  | {
      type: 'VALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'INVALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
      error: Error;
    }
  | TimeChangedEvent;

export const logStreamQueryNotificationEventSelectors = {
  validQueryChanged: (context: LogStreamQueryContext) =>
    'parsedQuery' in context
      ? ({
          type: 'VALID_QUERY_CHANGED',
          parsedQuery: context.parsedQuery,
        } as LogStreamQueryNotificationEvent)
      : undefined,
  invalidQueryChanged: (context: LogStreamQueryContext) =>
    'validationError' in context
      ? ({
          type: 'INVALID_QUERY_CHANGED',
          parsedQuery: context.parsedQuery,
          error: context.validationError,
        } as LogStreamQueryNotificationEvent)
      : undefined,
  timeChanged: (context: LogStreamQueryContext) => {
    return 'timeRange' in context && 'refreshInterval' in context && 'timestamps' in context
      ? ({
          type: 'TIME_CHANGED',
          timeRange: context.timeRange,
          refreshInterval: context.refreshInterval,
          timestamps: context.timestamps,
        } as LogStreamQueryNotificationEvent)
      : undefined;
  },
};
