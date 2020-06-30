/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, memo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Query, TimeRange } from 'src/plugins/data/public';
import { encode, RisonValue } from 'rison-node';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { urlFromQueryParams } from './url_from_query_params';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../store/selectors';
import { StartServices } from '../../types';
import { clone } from '../models/index_pattern';

export const AlertIndexSearchBar = memo(() => {
  const history = useHistory();
  const queryParams = useAlertListSelector(selectors.uiQueryParams);
  const searchBarIndexPatterns = useAlertListSelector(selectors.searchBarIndexPatterns);

  // Deeply clone the search bar index patterns as the receiving component may mutate them
  const clonedSearchBarIndexPatterns = useMemo(
    () => searchBarIndexPatterns.map((pattern) => clone(pattern)),
    [searchBarIndexPatterns]
  );
  const searchBarQuery = useAlertListSelector(selectors.searchBarQuery);
  const searchBarDateRange = useAlertListSelector(selectors.searchBarDateRange);
  const searchBarFilters = useAlertListSelector(selectors.searchBarFilters);

  const kibanaContext = useKibana<StartServices>();
  const {
    ui: { SearchBar },
    query: { filterManager },
  } = kibanaContext.services.data;

  useEffect(() => {
    // Update the the filters in filterManager when the filters url value (searchBarFilters) changes
    filterManager.setFilters(searchBarFilters);

    const filterSubscription = filterManager.getUpdates$().subscribe({
      next: () => {
        history.push(
          urlFromQueryParams({
            ...queryParams,
            filters: encode((filterManager.getFilters() as unknown) as RisonValue),
          })
        );
      },
    });
    return () => {
      filterSubscription.unsubscribe();
    };
  }, [filterManager, history, queryParams, searchBarFilters]);

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
          dataTestSubj="alertsSearchBar"
          appName="endpoint"
          isLoading={false}
          indexPatterns={clonedSearchBarIndexPatterns}
          query={searchBarQuery}
          dateRangeFrom={searchBarDateRange.from}
          dateRangeTo={searchBarDateRange.to}
          onQuerySubmit={onQuerySubmit}
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
