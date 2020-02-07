/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { HttpFetchQuery } from 'src/core/public';
import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';

export const alertMiddlewareFactory: MiddlewareFactory = coreStart => {
  const qp = qs.parse(window.location.search.slice(1));

  return api => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'alertsPage') {
      const response = await coreStart.http.get('/api/endpoint/alerts', {
        query: qp as HttpFetchQuery,
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
