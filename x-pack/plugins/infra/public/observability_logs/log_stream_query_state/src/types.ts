/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, Query } from '@kbn/es-query';
import { ActorRef } from 'xstate';

export interface LogStreamQueryContextWithDefaultQuery {
  defaultQuery: string;
}

export interface LogStreamQueryContextWithQuery {
  query: string;
}

export interface LogStreamQueryContextWithValidationError {
  validationError: Error;
}

export type LogStreamQueryTypestate =
  | {
      value: 'uninitialized';
      context: LogStreamQueryContextWithDefaultQuery;
    }
  | {
      value: 'hasQuery' | { hasQuery: 'valid' };
      context: LogStreamQueryContextWithDefaultQuery & LogStreamQueryContextWithQuery;
    }
  | {
      value: { hasQuery: 'invalid' };
      context: LogStreamQueryContextWithDefaultQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithValidationError;
    };

export type LogStreamQueryContext = LogStreamQueryTypestate['context'];

export type LogStreamQueryStateValue = LogStreamQueryTypestate['value'];

export type LogStreamQueryEvent =
  | {
      type: 'queryFromUrlChanged';
      query: Query | AggregateQuery;
    }
  | {
      type: 'queryFromUiChanged';
      query: Query | AggregateQuery;
    };

export type LogStreamQueryActor = ActorRef<LogStreamQueryEvent>;
