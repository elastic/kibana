/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { memo, useContext, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Query, TimeRange } from 'src/plugins/data/public';
import { AlertAction } from '../../store/alerts/action';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';
import { DepsStartContext } from '../../../endpoint/index';

export const AlertIndexSearchBar = memo(() => {
  // TODO: Why can't we use AppAction here?
  const dispatch: (action: AlertAction) => unknown = useDispatch();
  const searchBarIndexPatterns = useAlertListSelector(selectors.searchBarIndexPatterns);
  const searchBarQuery = useAlertListSelector(selectors.searchBarQuery);

  // TODO: Can we import like `import { SearchBar } from '../data/public'`?
  const depsStartContext = useContext(DepsStartContext);
  const {
    ui: { SearchBar },
    query: { filterManager },
  } = depsStartContext.data!;

  // TODO: Is this the only way to do this? Looks like this plugin
  // doesn't expect an onFiltersUpdated callback or a filters prop.
  // See: https://github.com/elastic/kibana/blob/master/src/plugins/data/public/ui/search_bar/create_search_bar.tsx#L189
  useEffect(() => {
    const filterSubscription = filterManager.getUpdates$().subscribe({
      next: () => {
        dispatch({
          type: 'userSubmittedAlertsSearchBarFilter',
          payload: {
            filters: filterManager.getFilters(),
          },
        });
      },
    });
    return () => {
      filterSubscription.unsubscribe();
    };
  }, []);

  const onQueryChange = useCallback(
    (params: { dateRange: TimeRange; query?: Query }) => {
      dispatch({
        type: 'userUpdatedAlertsSearchBarFilter',
        payload: {
          query: params.query,
          dateRange: params.dateRange,
        },
      });
    },
    [dispatch]
  );

  const onQuerySubmit = useCallback(
    (params: { dateRange: TimeRange; query?: Query }) => {
      dispatch({
        type: 'userSubmittedAlertsSearchBarFilter',
        payload: {
          query: params.query,
          dateRange: params.dateRange,
        },
      });
    },
    [dispatch]
  );

  return (
    <div>
      {searchBarIndexPatterns.length > 0 && (
        <SearchBar
          appName="endpoint"
          isLoading={false}
          indexPatterns={searchBarIndexPatterns}
          query={searchBarQuery}
          onQuerySubmit={onQuerySubmit}
          onQueryChange={onQueryChange}
          showFilterBar={true}
          showDatePicker={true}
          showQueryBar={true}
          showQueryInput={true}
          showSaveQuery={false}
        />
      )}
    </div>
  );
});
