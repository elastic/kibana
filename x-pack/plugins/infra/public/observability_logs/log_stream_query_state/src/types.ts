/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, BoolQuery, DataViewBase, Query } from '@kbn/es-query';
import { ActorRef } from 'xstate';

export type AnyQuery = Query | AggregateQuery;

export interface ParsedQuery {
  bool: BoolQuery;
}

export interface LogStreamQueryContextWithDataViews {
  dataViews: DataViewBase[];
}

export interface LogStreamQueryContextWithQuery {
  query: AnyQuery;
}

export interface LogStreamQueryContextWithParsedQuery {
  parsedQuery: ParsedQuery;
}

export interface LogStreamQueryContextWithValidationError {
  validationError: Error;
}

export type LogStreamQueryTypestate =
  | {
      value: 'uninitialized';
      context: LogStreamQueryContextWithDataViews;
    }
  | {
      value: 'hasQuery' | { hasQuery: 'validating' };
      context: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithQuery;
    }
  | {
      value: { hasQuery: 'valid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithParsedQuery;
    }
  | {
      value: { hasQuery: 'invalid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithValidationError;
    };

export type LogStreamQueryContext = LogStreamQueryTypestate['context'];

export type LogStreamQueryStateValue = LogStreamQueryTypestate['value'];

export type LogStreamQueryEvent =
  | {
      type: 'queryFromUrlChanged';
      query: AnyQuery;
    }
  | {
      type: 'queryFromUiChanged';
      query: AnyQuery;
    }
  | {
      type: 'dataViewsChanged';
      dataViews: DataViewBase[];
    }
  | {
      type: 'validationSucceeded';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'validationFailed';
      error: Error;
    };

export type LogStreamQueryActor = ActorRef<LogStreamQueryEvent>;
