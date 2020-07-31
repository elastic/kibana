/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { encode, RisonValue } from 'rison-node';
import { Query, TimeRange } from 'src/plugins/data/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { urlFromQueryParams } from '../pages/endpoint_hosts/view/url_from_query_params';
import { useHostSelector } from '../pages/endpoint_hosts/view/hooks';
import * as selectors from '../pages/endpoint_hosts/store/selectors';
import { StartServices } from '../../types';

export const AdminSearchBar = memo(() => {
  const history = useHistory();
  const queryParams = useHostSelector(selectors.uiQueryParams);
  const searchBarIndexPatterns = useHostSelector(selectors.patterns);
  const searchBarQuery = useHostSelector(selectors.searchBarQuery);

  const kibanaContext = useKibana<StartServices>();
  const {
    ui: { SearchBar },
    query: { filterManager },
  } = kibanaContext.services.data;

  useEffect(() => {
    // Update the the filters in filterManager when the filters url value (searchBarFilters) changes
    // filterManager.setFilters(searchBarFilters);

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
  }, [filterManager, history, queryParams]);

  const onQuerySubmit = useCallback(
    (params: { dateRange: TimeRange; query?: Query }) => {
      history.push(
        urlFromQueryParams({
          ...queryParams,
          admin_query: encode((params.query as unknown) as RisonValue),
          date_range: encode((params.dateRange as unknown) as RisonValue),
        })
      );
    },
    [history, queryParams]
  );

  return (
    <div>
      {searchBarIndexPatterns && searchBarIndexPatterns.length > 0 && (
        <SearchBar
          dataTestSubj="alertsSearchBar"
          appName="endpoint"
          isLoading={false}
          query={searchBarQuery}
          indexPatterns={searchBarIndexPatterns}
          onQuerySubmit={onQuerySubmit}
          showFilterBar={false}
          showDatePicker={false}
          showQueryBar={true}
          showQueryInput={true}
        />
      )}
    </div>
  );
});
