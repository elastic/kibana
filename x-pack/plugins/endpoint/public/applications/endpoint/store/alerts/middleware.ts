/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertResultList } from '../../../../../common/types';
import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';
import { isOnAlertPage, paginationDataFromUrl } from './selectors';

export const alertMiddlewareFactory: MiddlewareFactory = coreStart => {
  return {
    middleware: api => next => async (action: AppAction) => {
      next(action);
      const state = api.getState().alertList;

      if (action.type === 'urlHasChanged' && isOnAlertPage(state)) {
        const response: AlertResultList = await coreStart.http.post(`/api/endpoint/alerts`, {
          body: JSON.stringify(paginationDataFromUrl(state)),
        });
        api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
      }
    },
  };
};
