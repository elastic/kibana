/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { memo, useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { Query, TimeRange, SearchBarProps, IIndexPattern } from 'src/plugins/data/public';
import { AlertAction } from '../../store/alerts/action';
import * as selectors from '../../store/selectors';
import { DepsStartContext } from '../../../endpoint/index';

export const AlertIndexSearchBar = memo(() => {
  // TODO: Why can't we use AppAction here?
  const dispatch: (action: AlertAction) => unknown = useDispatch();

  interface AlertIndexSearchBarState {
    patterns: IIndexPattern[];
    filterQuery: Query;
  }
  const [state, setState] = useState<AlertIndexSearchBarState>({
    patterns: [],
    filterQuery: { query: '', language: 'kuery' },
  });

  // TODO: Can we import like `import { SearchBar } from '../data/public'`?
  const {
    data: {
      ui: { SearchBar },
      query: { timefilter },
      indexPatterns,
      autocomplete,
    },
  } = useContext(DepsStartContext);
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
      if (params.query !== undefined) {
        setState({
          ...state,
          filterQuery: {
            ...state.filterQuery,
            query: params.query.query,
            ...(params.query.language ? { language: params.query.language } : {}),
          },
        });
      }
    },
    [state]
  );

  const onQuerySubmit = useCallback(
    (params: Parameters<NonNullable<SearchBarProps['onQuerySubmit']>>[0]) => {
      if (params.query !== undefined) {
        dispatch({ type: 'userAppliedAlertsSearchFilter', payload: params.query });
      }
    },
    [dispatch]
  );

  /*
    <SearchBar
      appName="endpoint"
      isLoading={false}
      indexPatterns={indexPatterns}
      query={filterQuery}
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
          query={state.filterQuery}
          onClearSavedQuery={() => {}}
          onQuerySubmit={onQuerySubmit}
          onQueryChange={onQueryChange}
          onRefresh={() => {}}
          onSaved={() => {}}
          onSavedQueryUpdated={() => {}}
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
