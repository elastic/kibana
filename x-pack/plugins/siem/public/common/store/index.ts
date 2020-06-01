/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './model';
export * from './reducer';
export * from './selectors';

import { Middleware, Dispatch } from 'redux';
import { createStore, getStore } from './store';
import { ImmutableMiddleware, State } from './types';
import { AppAction } from './actions';
import { Immutable } from '../../../common/endpoint/types';

export { createStore, getStore };

/**
 * Takes a selector and an `ImmutableMiddleware`. The
 * middleware's version of `getState` will receive
 * the result of the selector instead of the global state.
 *
 * This allows middleware to have knowledge of only a subsection of state.
 *
 * `selector` returns an `Immutable` version of the substate.
 * `middleware` must be an `ImmutableMiddleware`.
 *
 * Returns a regular middleware, meant to be used with `applyMiddleware`.
 */
export const substateMiddlewareFactory = <Substate>(
  selector: (state: State) => Substate | Immutable<Substate>,
  middleware: ImmutableMiddleware<Substate, AppAction>
): Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>> => {
  return (api) => {
    const substateAPI = {
      ...api,
      // Return just the substate instead of global state.
      getState(): Immutable<Substate> {
        return selector(api.getState()) as Immutable<Substate>;
      },
    };
    return middleware(substateAPI);
  };
};
