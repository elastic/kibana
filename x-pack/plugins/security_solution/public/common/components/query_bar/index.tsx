/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import {
  FilterManager,
  TimeHistory,
  TimeRange,
  SavedQuery,
  SavedQueryTimeFilter,
} from '../../../../../../../src/plugins/data/public';
import { DataView } from '../../../../../../../src/plugins/data_views/public';
import { SearchBar } from '../../../../../../../src/plugins/unified_search/public';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';

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
  }) => {
    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (payload.query != null && !deepEqual(payload.query, filterQuery)) {
          onSubmitQuery(payload.query);
        }
      },
      [filterQuery, onSubmitQuery]
    );

    const onQueryChange = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (onChangedQuery && payload.query != null && !deepEqual(payload.query, filterQuery)) {
          onChangedQuery(payload.query);
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

    const CustomButton = <>{null}</>;
    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);

    return (
      <SearchBar
        customSubmitButton={CustomButton}
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
        showDatePicker={false}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
        timeHistory={new TimeHistory(new Storage(localStorage))}
        dataTestSubj={dataTestSubj}
        savedQuery={savedQuery}
      />
    );
  }
);

QueryBar.displayName = 'QueryBar';
