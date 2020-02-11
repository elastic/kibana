/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';
import { flattenedPromise } from '../../lib/flattened_promise';

export const routingMiddlewareFactory: MiddlewareFactory = (coreStart, history) => {
  const [promise, resolve] = flattenedPromise();

  return {
    middleware: api => {
      const emit = () => {
        api.dispatch({ type: 'userChangedUrl', payload: window.location.href });
      };
      history.listen(emit);
      (async () => {
        await promise;
        emit();
      })();
      return next => async (action: AppAction) => {
        next(action);
      };
    },
    start: resolve,
  };
};
