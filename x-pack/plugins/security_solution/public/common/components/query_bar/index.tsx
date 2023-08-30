/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import type { DataViewBase, Filter, Query, TimeRange } from '@kbn/es-query';
import type { FilterManager, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import { TimeHistory } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';

import { useKibana } from '../../lib/kibana';

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
    const { data, fieldFormats } = useKibana().services;
    // const [dataView, setDataView] = useState([indexPattern] as DataView[]);
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

    // useEffect(() => {
    //   if (Object.hasOwn(indexPattern, 'getName')) {
    //     setDataView([indexPattern] as DataView[]);
    //   } else {
    //     const createDataView = async () => {
    //       const dv = await data.dataViews.create({ title: indexPattern.title });
    //       setDataView([dv]);
    //     };
    //     createDataView();
    //   }
    // }, [data.dataViews, indexPattern]);

    const dataView = useMemo(() => {
      if (Object.hasOwn(indexPattern, 'getName')) {
        return [indexPattern] as DataView[];
      }
      const dv = new DataView({
        spec: {
          ...indexPattern,
          fields: indexPattern.fields.reduce((acc, field) => {
            // @ts-expect-error missing 'searchable' , aggregatable properties
            // this is okay because it's better than having the whole app
            // explode
            acc[field.name] = field;
            return acc;
          }, {} as DataViewFieldMap),
        },
        fieldFormats,
      });
      return [dv];
    }, [indexPattern, fieldFormats]);

    const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

    return (
      <SearchBar
        showSubmitButton={false}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        filters={filters}
        indexPatterns={dataView}
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
