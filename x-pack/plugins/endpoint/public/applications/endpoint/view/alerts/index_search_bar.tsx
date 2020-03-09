/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { memo, useContext, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { encode, RisonValue } from 'rison-node';
import { Query, TimeRange, Filter } from 'src/plugins/data/public';
import { urlFromQueryParams } from './url_from_query_params';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';
import { DepsStartContext } from '../../../endpoint/index';

export const AlertIndexSearchBar = memo(() => {
  const history = useHistory();
  const queryParams = useAlertListSelector(selectors.uiQueryParams);
  const searchBarIndexPatterns = useAlertListSelector(selectors.searchBarIndexPatterns);
  const searchBarQuery = useAlertListSelector(selectors.searchBarQuery);
  const searchBarDateRange = useAlertListSelector(selectors.searchBarDateRange);
  const searchBarFilters = useAlertListSelector(selectors.searchBarFilters);

  // TODO: Can we import like `import { SearchBar } from '../data/public'`?
  const depsStartContext = useContext(DepsStartContext);
  const {
    ui: { SearchBar },
    query: { filterManager },
  } = depsStartContext.data!;

  // Update the the filters in filterManager when the filters url value (searchBarFilters) changes
  useEffect(() => {
    filterManager.setFilters(searchBarFilters);
  }, [filterManager, searchBarFilters]);

  const onFiltersUpdated = useCallback(
    (filters: Filter[]) => {
      history.push(
        urlFromQueryParams({
          ...queryParams,
          filters: encode((filters as unknown) as RisonValue),
        })
      );
    },
    [queryParams, history]
  );

  const onQuerySubmit = useCallback(
    (params: { dateRange: TimeRange; query?: Query }) => {
      history.push(
        urlFromQueryParams({
          ...queryParams,
          query: encode((params.query as unknown) as RisonValue),
          date_range: encode((params.dateRange as unknown) as RisonValue),
        })
      );
    },
    [history, queryParams]
  );

  return (
    <div>
      {searchBarIndexPatterns.length > 0 && (
        <SearchBar
          appName="endpoint"
          isLoading={false}
          indexPatterns={searchBarIndexPatterns}
          query={searchBarQuery}
          dateRangeFrom={searchBarDateRange.from}
          dateRangeTo={searchBarDateRange.to}
          onQuerySubmit={onQuerySubmit}
          onFiltersUpdated={onFiltersUpdated}
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
