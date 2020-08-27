/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { AsyncAction } from '../actions/types';

export function handleAsyncAction<ReducerState>(
  storeKey: keyof ReducerState,
  asyncAction: AsyncAction<any, any>
) {
  return {
    [String(asyncAction.get)]: (state: ReducerState) => ({
      ...state,
      [storeKey]: {
        ...(state as any)[storeKey],
        loading: true,
      },
    }),

    [String(asyncAction.success)]: (state: ReducerState, action: Action<any>) => {
      return {
        ...state,
        [storeKey]: {
          ...(state as any)[storeKey],
          data: action.payload,
          loading: false,
        },
      };
    },

    [String(asyncAction.fail)]: (state: ReducerState, action: Action<any>) => ({
      ...state,
      [storeKey]: {
        ...(state as any)[storeKey],
        data: null,
        error: action.payload,
        loading: false,
      },
    }),
  };
}

export function asyncInitState(initialData = null) {
  return {
    data: initialData,
    loading: false,
    error: null,
  };
}
