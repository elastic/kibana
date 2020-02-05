/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
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
    } else if (action.type === 'userChangedAlertPageIndex') {
      const response = await coreStart.http.post(`/api/endpoint/alerts`, {
        body: JSON.stringify({
          page_index: action.payload,
          page_size: api.getState().alertList.request_page_size,
        }),
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    } else if (action.type === 'userChangedAlertPageSize') {
      const response = await coreStart.http.post(`/api/endpoint/alerts`, {
        body: JSON.stringify({
          page_index: api.getState().alertList.request_page_index,
          page_size: action.payload,
        }),
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
