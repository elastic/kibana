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
export const substateMiddlewareFactory = <Substate = never>(
  selector: (state: State) => Substate | Immutable<Substate>,
  middleware: ImmutableMiddleware<Substate, AppAction>
): Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>> => {
  return (api) => {
    const substateAPI = {
      ...api,
      // Return the substate instead of global state.
      getState(): Immutable<Substate> {
        /**
         * The selector will receive the basic (mutable) version of state. This is because
         * the top level state shape doesn't use `Immutable`. We cast the return value as `Immutable`
         * so that the middleware won't be able to mutate state.
         *
         * Immutable enforces nothing structural about a type so casting
         * a value as `Immutable` is safe as long as nothing else is going to mutate.
         * Since the state came from the return value of a reducer, the reducer will (hopefully)
         * not be mutating it.
         */
        return selector(api.getState()) as Immutable<Substate>;
      },
    };
    return middleware(substateAPI);
  };
};
