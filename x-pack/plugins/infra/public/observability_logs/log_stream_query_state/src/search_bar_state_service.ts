/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryStringContract } from '@kbn/data-plugin/public';
import { map } from 'rxjs/operators';
import type { InvokeCreator } from 'xstate';
import type { LogStreamQueryContext, LogStreamQueryEvent } from './types';

export const subscribeToSearchBarChanges =
  ({
    queryStringService,
  }: {
    queryStringService: QueryStringContract;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (context) =>
    queryStringService.getUpdates$().pipe(
      map(() => queryStringService.getQuery()),
      map((query): LogStreamQueryEvent => {
        return {
          type: 'QUERY_FROM_SEARCH_BAR_CHANGED',
          query,
        };
      })
    );

export const updateQueryInSearchBar =
  ({ queryStringService }: { queryStringService: QueryStringContract }) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (!('query' in context)) {
      return;
    }

    queryStringService.setQuery(context.query);
  };
