/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';

export const resolverMiddlewareFactory: MiddlewareFactory = coreStart => {
  return api => next => async (action: AppAction) => {
    next(action);
    if (action.type === 'userNavigatedToPage' && action.payload === 'resolverPage') {
      const response: any = await coreStart.http.get('/api/endpoint/resolver', {
        query: { uniquePid: 12 },
      });
      api.dispatch({ type: 'serverReturnedResolverData', payload: response });
    }
  };
};
