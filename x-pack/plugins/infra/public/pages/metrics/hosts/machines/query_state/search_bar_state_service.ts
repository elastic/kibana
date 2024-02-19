/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager, QueryStringContract } from '@kbn/data-plugin/public';
import { map } from 'rxjs/operators';
import type { InvokeCreator } from 'xstate';
import type { HostsViewQueryContext, HostsViewQueryEvent } from './types';

export const subscribeToQuerySearchBarChanges =
  ({
    queryStringService,
  }: {
    queryStringService: QueryStringContract;
  }): InvokeCreator<HostsViewQueryContext, HostsViewQueryEvent> =>
  (context) =>
    queryStringService.getUpdates$().pipe(
      map(() => queryStringService.getQuery()),
      map((query): HostsViewQueryEvent => {
        return {
          type: 'QUERY_FROM_SEARCH_BAR_CHANGED',
          query,
        };
      })
    );

export const updateQueryInSearchBar =
  ({ queryStringService }: { queryStringService: QueryStringContract }) =>
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if ('query' in context) {
      queryStringService.setQuery(context.query);
    }
  };

export const subscribeToFilterSearchBarChanges =
  ({
    filterManagerService,
  }: {
    filterManagerService: FilterManager;
  }): InvokeCreator<HostsViewQueryContext, HostsViewQueryEvent> =>
  (context) =>
    filterManagerService.getUpdates$().pipe(
      map(() => filterManagerService.getFilters()),
      map((filters): HostsViewQueryEvent => {
        return {
          type: 'FILTERS_FROM_SEARCH_BAR_CHANGED',
          filters,
        };
      })
    );

export const updateFiltersInSearchBar =
  ({ filterManagerService }: { filterManagerService: FilterManager }) =>
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if ('filters' in context) {
      filterManagerService.setFilters(context.filters);
    }
  };
