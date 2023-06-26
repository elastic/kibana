/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import type { DataViewBase, Filter, Query, AggregateQuery, TimeRange } from '@kbn/es-query';
import type { FilterManager, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import { TimeHistory } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

const convertToQueryType = (query: Query | AggregateQuery): Query => {
  if ('esql' in query) {
    return {
      query: query.esql,
      language: 'esql',
    };
  }

  return query as Query;
};
export interface QueryBarComponentProps {
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  hideSavedQuery?: boolean;
  indexPattern: DataViewBase;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  onChangedQuery?: (query: Query) => void;
  onSubmitQuery: (query: Query, timefilter?: SavedQueryTimeFilter) => void;
  refreshInterval?: number;
  savedQuery?: SavedQuery;
  onSavedQuery: (savedQuery: SavedQuery | undefined) => void;
  displayStyle?: SearchBarProps['displayStyle'];
  isDisabled?: boolean;
}

export const QueryBar = memo<QueryBarComponentProps>(
  ({
    dateRangeFrom,
    dateRangeTo,
    hideSavedQuery = false,
    indexPattern,
    isLoading = false,
    isRefreshPaused,
    filterQuery,
    filterManager,
    filters,
    onChangedQuery,
    onSubmitQuery,
    refreshInterval,
    savedQuery,
    onSavedQuery,
    dataTestSubj,
    displayStyle,
    isDisabled,
  }) => {
    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query | AggregateQuery }) => {
        if (payload.query != null && !deepEqual(payload.query, filterQuery)) {
          const payloadQuery = convertToQueryType(payload.query);

          onSubmitQuery(payloadQuery);
        }
      },
      [filterQuery, onSubmitQuery]
    );

    const onQueryChange = useCallback(
      (payload: { dateRange: TimeRange; query?: Query | AggregateQuery }) => {
        if (onChangedQuery && payload.query != null && !deepEqual(payload.query, filterQuery)) {
          const payloadQuery = convertToQueryType(payload.query);
          onChangedQuery(payloadQuery);
        }
      },
      [filterQuery, onChangedQuery]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const { query: newQuery, filters: newFilters, timefilter } = savedQueryUpdated.attributes;
        onSubmitQuery(newQuery, timefilter);
        filterManager.setFilters(newFilters || []);
        onSavedQuery(savedQueryUpdated);
      },
      [filterManager, onSubmitQuery, onSavedQuery]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        onSubmitQuery({
          query: '',
          language: savedQuery.attributes.query.language,
        });
        filterManager.setFilters([]);
        onSavedQuery(undefined);
      }
    }, [filterManager, onSubmitQuery, onSavedQuery, savedQuery]);

    const onFiltersUpdated = useCallback(
      (newFilters: Filter[]) => {
        filterManager.setFilters(newFilters);
      },
      [filterManager]
    );

    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);
    const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

    const query = useMemo(() => {
      if (filterQuery?.language === 'esql') {
        return { esql: filterQuery.query as string };
      }
      return filterQuery;
    }, [filterQuery]);

    return (
      <SearchBar
        showSubmitButton={false}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        filters={filters}
        indexPatterns={indexPatterns as DataView[]}
        isLoading={isLoading}
        isRefreshPaused={isRefreshPaused}
        query={query}
        onClearSavedQuery={onClearSavedQuery}
        onFiltersUpdated={onFiltersUpdated}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        onSaved={onSavedQuery}
        onSavedQueryUpdated={onSavedQueryUpdated}
        refreshInterval={refreshInterval}
        showAutoRefreshOnly={false}
        showFilterBar={!hideSavedQuery}
        showDatePicker={false}
        showQueryInput={true}
        showSaveQuery={true}
        timeHistory={timeHistory}
        dataTestSubj={dataTestSubj}
        savedQuery={savedQuery}
        displayStyle={displayStyle}
        isDisabled={isDisabled}
      />
    );
  }
);

QueryBar.displayName = 'QueryBar';
