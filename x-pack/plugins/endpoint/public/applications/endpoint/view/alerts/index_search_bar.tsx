/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { memo, useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import {
  Query,
  TimeRange,
  SearchBarProps,
  IIndexPattern,
  esFilters,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
import { AlertAction } from '../../store/alerts/action';
import * as selectors from '../../store/selectors';
import { DepsStartContext } from '../../../endpoint/index';
import { EndpointPluginStartDependencies } from '../../../../plugin';

export const AlertIndexSearchBar = memo(() => {
  // TODO: Why can't we use AppAction here?
  const dispatch: (action: AlertAction) => unknown = useDispatch();

  interface AlertIndexSearchBarState {
    patterns: IIndexPattern[];
    query: Query;
    dateRange: TimeRange;
    filters: esFilters.Filter[];
  }
  const [state, setState] = useState<AlertIndexSearchBarState>({
    patterns: [],
    query: { query: '', language: 'kuery' },
    dateRange: { from: '', to: '' },
    filters: [],
  });

  // TODO: Can we import like `import { SearchBar } from '../data/public'`?
  const {
    data: {
      ui: { SearchBar },
      query: { timefilter, filterManager },
      indexPatterns,
      autocomplete,
    },
  } = useContext<EndpointPluginStartDependencies>(DepsStartContext);

  useEffect(() => {
    async function fetchIndexPatterns() {
      // TODO: what's the best way to get the index pattern?
      // const pattern = await indexPatterns.get('287e7b60-4394-11ea-aaac-c76376668d76');
      const fields = await indexPatterns.getFieldsForWildcard({ pattern: 'my-index' });
      const pattern = {
        title: 'my-index',
        fields,
      };
      const suggestions = await autocomplete.getQuerySuggestions({
        language: 'kuery',
        indexPatterns: [pattern],
        query: 'host',
        boolFilter: [],
        // selectionStart: 1546300800,
        // selectionEnd: 1580425140,
      });
      setState({
        ...state,
        patterns: [pattern],
      });
    }

    fetchIndexPatterns();
  }, []);

  const onQueryChange = useCallback(
    (params: Parameters<NonNullable<SearchBarProps['onQueryChange']>>[0]) => {
      let newQuery = state.query;
      if (params.query !== undefined) {
        newQuery = {
          ...state.query,
          query: params.query.query,
          ...(params.query.language ? { language: params.query.language } : {}),
        };
      }
      console.log(params)
      setState({
        ...state,
        query: {
          ...newQuery,
        },
        dateRange: {
          to: params.dateRange.to,
          from: params.dateRange.from,
        },
      });
    },
    [state]
  );

  const onQuerySubmit = useCallback(
    (params: Parameters<NonNullable<SearchBarProps['onQuerySubmit']>>[0]) => {
      if (params.query !== undefined) {
        dispatch({
          type: 'userAppliedAlertsSearchFilter',
          payload: {
            query: state.query,
            filters: state.filters,
            dateRange: state.dateRange,
          },
        });
      }
    },
    [dispatch, state]
  );

  const onFiltersUpdated = useCallback(
    (filters: Parameters<NonNullable<SearchBarProps['onFiltersUpdated']>>[0]) => {
      filterManager.setFilters(filters);
      setState({
        ...state,
        filters: filterManager.getFilters(),
      });
      dispatch({
        type: 'userAppliedAlertsSearchFilter',
        payload: {
          query: state.query,
          filters,
          dateRange: state.dateRange,
        },
      });
    },
    [filterManager, dispatch, state]
  );

  /*
    <SearchBar
      appName="endpoint"
      isLoading={false}
      indexPatterns={indexPatterns}
      query={query}
      onClearSavedQuery={onClearSavedQuery}
      onQuerySubmit={onQuerySubmit}
      onRefresh={onRefresh}
      onSaved={onSaved}
      onSavedQueryUpdated={onSavedQueryUpdated}
      savedQuery={savedQuery}
      showFilterBar={true}
      showDatePicker={true}
      showQueryBar={true}
      showQueryInput={true}
      showSaveQuery={true}
      dataTestSubj={dataTestSubj}
    />
   */
  return (
    <div>
      {state.patterns.length > 0 && (
        <SearchBar
          appName="endpoint"
          isLoading={false}
          indexPatterns={state.patterns}
          query={state.query}
          onClearSavedQuery={() => {}}
          onQuerySubmit={onQuerySubmit}
          onQueryChange={onQueryChange}
          onRefresh={() => {}}
          onSaved={() => {}}
          onSavedQueryUpdated={() => {}}
          onFiltersUpdated={onFiltersUpdated}
          showFilterBar={true}
          showDatePicker={true}
          showQueryBar={true}
          showQueryInput={true}
          showSaveQuery={true}
        />
      )}
    </div>
  );
});
