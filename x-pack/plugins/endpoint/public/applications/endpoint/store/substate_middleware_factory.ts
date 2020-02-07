/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Middleware, Dispatch, MiddlewareAPI } from 'redux';
import { AppAction } from './action';
import { GlobalState } from '../types';

export type Selector<S, R> = (state: S) => R;

export const substateMiddlewareFactory = <Substate>(
  selector: Selector<GlobalState, Substate>,
  middleware: Middleware<{}, Substate, Dispatch<AppAction>>
): Middleware<{}, GlobalState, Dispatch<AppAction>> => {
  return api => {
    const substateAPI: MiddlewareAPI<Dispatch<AppAction>, Substate> = {
      ...api,
      getState() {
        return selector(api.getState());
      },
    };
    return middleware(substateAPI);
  };
};
