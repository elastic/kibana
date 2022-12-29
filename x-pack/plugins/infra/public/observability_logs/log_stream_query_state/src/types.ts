/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, BoolQuery, DataViewBase, Query, Filter } from '@kbn/es-query';

export type AnyQuery = Query | AggregateQuery;

export interface ParsedQuery {
  bool: BoolQuery;
}

export interface LogStreamQueryContextWithDataViews {
  dataViews: DataViewBase[];
}

export interface LogStreamQueryContextWithSavedQueryId {
  savedQueryId: string;
}
export interface LogStreamQueryContextWithQuery {
  query: AnyQuery;
}

export interface LogStreamQueryContextWithParsedQuery {
  parsedQuery: ParsedQuery;
}

export interface LogStreamQueryContextWithFilters {
  filters: Filter[];
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
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters;
    }
  | {
      value: { hasQuery: 'valid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters;
    }
  | {
      value: { hasQuery: 'invalid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters &
        LogStreamQueryContextWithValidationError;
    };

export type LogStreamQueryContext = LogStreamQueryTypestate['context'];

export type LogStreamQueryStateValue = LogStreamQueryTypestate['value'];

export type LogStreamQueryEvent =
  | {
      type: 'QUERY_FROM_SEARCH_BAR_CHANGED';
      query: AnyQuery;
    }
  | {
      type: 'FILTERS_FROM_SEARCH_BAR_CHANGED';
      filters: Filter[];
    }
  | {
      type: 'DATA_VIEWS_CHANGED';
      dataViews: DataViewBase[];
    }
  | {
      type: 'VALIDATION_SUCCEEDED';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'VALIDATION_FAILED';
      error: Error;
    }
  | {
      type: 'INITIALIZED_FROM_URL';
      query: AnyQuery;
      filters: Filter[];
    };
