/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Middleware, Dispatch, MiddlewareAPI } from 'redux';
import { ResolverState, ResolverAction } from '../types';

export type Selector<S, R> = (state: S) => R;

export const substateMiddlewareFactory = <Substate>(
  selector: Selector<ResolverState, Substate>,
  middleware: Middleware<{}, Substate, Dispatch<ResolverAction>>
): Middleware<{}, ResolverState, Dispatch<ResolverAction>> => {
  return api => {
    const substateAPI: MiddlewareAPI<Dispatch<ResolverAction>, Substate> = {
      ...api,
      getState() {
        return selector(api.getState());
      },
    };
    return middleware(substateAPI);
  };
};
