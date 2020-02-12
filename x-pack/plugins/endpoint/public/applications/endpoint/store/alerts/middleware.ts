/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import { encode } from 'rison-node';
import { HttpFetchQuery } from 'src/core/public';
import { AppAction } from '../action';
import { MiddlewareFactory, AlertListData } from '../../types';

export const alertMiddlewareFactory: MiddlewareFactory = coreStart => {
  const qp = parse(window.location.search.slice(1), { sort: false });

  return api => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'alertsPage') {
      const response: AlertListData = await coreStart.http.get('/api/endpoint/alerts', {
        query: qp as HttpFetchQuery,
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    } else if (action.type === 'userAppliedAlertsSearchFilter') {
      const { query, filters, dateRange } = action.payload;

      // HACK
      // Not the right place to do this, but I noticed sometimes the `from` and the `to` aren't
      // populated, so this keeps it from breaking.
      if (!dateRange.from) {
        dateRange.from = 'now-15m';
      }
      if (!dateRange.to) {
        dateRange.to = 'now';
      }
      // END HACK

      const response = await coreStart.http.get('/api/endpoint/alerts', {
        query: {
          query: query.query,
          filters: encode(filters),
          date_range: encode(dateRange),
        } as HttpFetchQuery,
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
