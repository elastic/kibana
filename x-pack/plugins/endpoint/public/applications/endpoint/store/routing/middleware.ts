/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppAction } from '../action';
import { MiddlewareFactory } from '../../types';

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

// TODO: move this
function flattenedPromise<T>(): [Promise<T>, PromiseResolver<T>, PromiseRejector<T>] {
  let newResolve: PromiseResolver<T>;
  let newReject: PromiseRejector<T>;
  const promise = new Promise<T>((resolve, reject) => {
    newResolve = resolve;
    newReject = reject;
  });
  return [promise, newResolve!, newReject!];
}

type PromiseResolver<T> = (value?: T | PromiseLike<T>) => void;

type PromiseRejector<T> = (reason?: any) => void;
