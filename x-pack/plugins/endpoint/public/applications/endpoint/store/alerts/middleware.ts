/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { encode, RisonValue } from 'rison-node';
import { HttpFetchQuery } from 'src/core/public';
import { IIndexPattern } from 'src/plugins/data/public';
import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';
import * as selectors from '../selectors';

export const alertMiddlewareFactory: MiddlewareFactory = (coreStart, depsStart) => {
  const qp = qs.parse(window.location.search.slice(1));

  async function fetchIndexPatterns(): Promise<IIndexPattern[]> {
    const { indexPatterns } = depsStart.data;
    // TODO: what's the best way to get the index pattern?
    // const pattern = await indexPatterns.get('287e7b60-4394-11ea-aaac-c76376668d76');
    const fields = await indexPatterns.getFieldsForWildcard({ pattern: 'my-index' });
    return [
      {
        title: 'my-index',
        fields,
      },
    ];
  }
  return api => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'alertsPage') {
      // Get search bar index patterns
      const patterns = await fetchIndexPatterns();
      api.dispatch({ type: 'serverReturnedSearchBarIndexPatterns', payload: patterns });

      const response = await coreStart.http.get('/api/endpoint/alerts', {
        query: qp as HttpFetchQuery,
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    } else if (action.type === 'userSubmittedAlertsSearchBarFilter') {
      const searchBarQuery = selectors.searchBarQuery(api.getState());
      const searchBarFilters = selectors.searchBarFilters(api.getState());
      const searchBarDateRange = selectors.searchBarDateRange(api.getState());
      const response = await coreStart.http.get('/api/endpoint/alerts', {
        query: {
          query: searchBarQuery.query,
          filters: encode((searchBarFilters as unknown) as RisonValue),
          date_range: encode((searchBarDateRange as unknown) as RisonValue),
        } as HttpFetchQuery,
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
