/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertResultList, AlertData } from '../../../../../common/types';
import { AppAction } from '../action';
import { MiddlewareFactory, AlertListState } from '../../types';
import { isOnAlertPage, apiQueryParams, hasSelectedAlert, uiQueryParams } from './selectors';

export const alertMiddlewareFactory: MiddlewareFactory<AlertListState> = coreStart => {
  return api => next => async (action: AppAction) => {
    next(action);
    const state = api.getState();
    if (action.type === 'userChangedUrl' && isOnAlertPage(state)) {
      const response: AlertResultList = await coreStart.http.get(`/api/endpoint/alerts`, {
        query: apiQueryParams(state),
      });
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
    if (action.type === 'userChangedUrl' && isOnAlertPage(state) && hasSelectedAlert(state)) {
      const uiParams = uiQueryParams(state);
      const response: AlertData = await coreStart.http.get(
        `/api/endpoint/alerts/${uiParams.selected_alert}`
      );
      api.dispatch({ type: 'serverReturnedAlertDetailsData', payload: response });
    }
  };
};
