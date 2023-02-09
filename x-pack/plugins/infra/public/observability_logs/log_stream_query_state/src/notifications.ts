/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogStreamQueryContext, ParsedQuery } from './types';

export type LogStreamQueryNotificationEvent =
  | {
      type: 'VALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'INVALID_QUERY_CHANGED';
      parsedQuery: ParsedQuery;
      error: Error;
    };

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
};
