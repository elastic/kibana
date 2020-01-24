/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { AlertData } from '../../../../../endpoint_app_types';
import { GlobalState } from '../reducer';
import { AppAction } from '../action';

// TODO, move this somewhere
type MiddlewareFactory = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, GlobalState>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export const alertMiddlewareFactory: MiddlewareFactory = coreStart => {
  return store => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'alertsPage') {
      const response: AlertData[] = await coreStart.http.get('/api/endpoint/alerts');
      store.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
