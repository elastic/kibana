/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, Middleware } from 'redux';
import {
  loadingIndicator as defaultLoadingIndicator,
  LoadingIndicatorInterface,
} from '../../lib/loading_indicator';
// @ts-expect-error
import { convert } from '../../lib/modify_path';

interface InFlightMiddlewareOptions {
  pendingCache: string[];
  loadingIndicator: LoadingIndicatorInterface;
}

import {
  Action as AnyAction,
  inFlightActive,
  inFlightActiveActionType,
  inFlightComplete,
  inFlightCompleteActionType,
  setLoadingActionType,
  setValueActionType,
} from '../actions/resolved_args';

const pathToKey = (path: any[]) => convert(path).join('/');

export const inFlightMiddlewareFactory = ({
  loadingIndicator,
  pendingCache,
}: InFlightMiddlewareOptions): Middleware => {
  return ({ dispatch }) => (next: Dispatch) => {
    return (action: AnyAction) => {
      if (action.type === setLoadingActionType) {
        const cacheKey = pathToKey(action.payload.path);
        pendingCache.push(cacheKey);
        dispatch(inFlightActive());
      } else if (action.type === setValueActionType) {
        const cacheKey = pathToKey(action.payload.path);
        const idx = pendingCache.indexOf(cacheKey);
        if (idx >= 0) {
          pendingCache.splice(idx, 1);
        }
        if (pendingCache.length === 0) {
          dispatch(inFlightComplete());
        }
      } else if (action.type === inFlightActiveActionType) {
        loadingIndicator.show();
      } else if (action.type === inFlightCompleteActionType) {
        loadingIndicator.hide();
      }

      // execute the action
      next(action);
    };
  };
};

export const inFlight = inFlightMiddlewareFactory({
  loadingIndicator: defaultLoadingIndicator,
  pendingCache: [],
});
