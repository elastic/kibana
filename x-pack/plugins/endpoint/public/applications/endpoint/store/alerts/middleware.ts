/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertData, ImmutableArray } from '../../../../../common/types';
import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';

export const alertMiddlewareFactory: MiddlewareFactory = coreStart => {
  return api => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'alertsPage') {
      const response: ImmutableArray<AlertData> = await coreStart.http.get('/api/endpoint/alerts');
      api.dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
