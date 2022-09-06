/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  FilterManager,
  TimeHistory,
  SavedQuery,
  SavedQueryTimeFilter,
} from '@kbn/data-plugin/public';
import { SearchBar, SearchBarProps } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SecuritySolutionDataViewBase } from '../../../../types';

interface QueryPayload {
  dateRange: TimeRange;
  query?: Query | AggregateQuery;
}

/**
 * User defined type guard to verify if we are dealing with Query param
 * @param query query param to test
 * @returns
 */
const isQuery = (query?: Query | AggregateQuery | null): query is Query => {
  return !!query && Object.prototype.hasOwnProperty.call(query, 'query');
};

export interface QueryBarComponentProps {
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  hideSavedQuery?: boolean;
  indexPattern: SecuritySolutionDataViewBase;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  onRefresh: VoidFunction;
  onChangedQuery?: (query: Query) => void;
  onChangedDateRange?: (dateRange?: TimeRange) => void;
  onSubmitQuery: (query: Query, timefilter?: SavedQueryTimeFilter) => void;
  onSubmitDateRange: (dateRange?: TimeRange) => void;
  refreshInterval?: number;
  savedQuery?: SavedQuery;
  onSavedQuery: (savedQuery: SavedQuery | undefined) => void;
  displayStyle?: SearchBarProps['displayStyle'];
}

export const INDICATOR_FILTER_DROP_AREA = 'indicator-filter-drop-area';

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
    refreshInterval,
    savedQuery,
    dataTestSubj,
    displayStyle,
    onChangedQuery,
    onSubmitQuery,
    onChangedDateRange,
    onSubmitDateRange,
    onSavedQuery,
    onRefresh,
  }) => {
    const onQuerySubmit = useCallback(
      ({ query, dateRange }: QueryPayload) => {
        if (isQuery(query) && !deepEqual(query, filterQuery)) {
          onSubmitQuery(query);
        }

        if (dateRange != null) {
          onSubmitDateRange(dateRange);
        }
      },
      [filterQuery, onSubmitDateRange, onSubmitQuery]
    );

    const onQueryChange = useCallback(
      ({ query, dateRange }: QueryPayload) => {
        if (!onChangedQuery) {
          return;
        }

        if (isQuery(query) && !deepEqual(query, filterQuery)) {
          onChangedQuery(query);
        }

        if (onChangedDateRange && dateRange != null) {
          onChangedDateRange(dateRange);
        }
      },
      [filterQuery, onChangedDateRange, onChangedQuery]
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
        return filterManager.setFilters(newFilters);
      },
      [filterManager]
    );

    const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);

    return (
      <SearchBar
        showSubmitButton={true}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        filters={filters}
        indexPatterns={indexPatterns as DataView[]}
        isLoading={isLoading}
        isRefreshPaused={isRefreshPaused}
        query={filterQuery}
        onClearSavedQuery={onClearSavedQuery}
        onFiltersUpdated={onFiltersUpdated}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        onSaved={onSavedQuery}
        onSavedQueryUpdated={onSavedQueryUpdated}
        refreshInterval={refreshInterval}
        showAutoRefreshOnly={false}
        showFilterBar={!hideSavedQuery}
        showDatePicker={true}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
        timeHistory={timeHistory}
        dataTestSubj={dataTestSubj}
        savedQuery={savedQuery}
        displayStyle={displayStyle}
        onRefresh={onRefresh}
      />
    );
  }
);

QueryBar.displayName = 'QueryBar';
