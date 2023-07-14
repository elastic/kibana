/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { SpyMiddleware, SpyMiddlewareStateActionPair } from '../types';

/**
 * Return a `SpyMiddleware` to be used in testing. Use `debugActions` to console.log actions and the state they produced.
 * For reducer/middleware tests, you can use `actions` to get access to each dispatched action along with the state it produced.
 */
export const spyMiddlewareFactory: () => SpyMiddleware = () => {
  const resolvers: Set<(stateActionPair: SpyMiddlewareStateActionPair) => void> = new Set();

  const actions = async function* actions() {
    while (true) {
      const promise: Promise<SpyMiddlewareStateActionPair> = new Promise((resolve) => {
        resolvers.add(resolve);
      });
      yield await promise;
    }
  };

  return {
    middleware: (api) => (next) => (action: AnyAction) => {
      // handle the action first so we get the state after the reducer
      next(action);

      const state = api.getState();

      // Resolving these promises may cause code to await the next result. That will add more resolve functions to `resolvers`.
      // For this reason, copy all the existing resolvers to an array and clear the set.
      const oldResolvers = [...resolvers];
      resolvers.clear();
      for (const resolve of oldResolvers) {
        resolve({ action, state });
      }
    },
    actions,
    debugActions() {
      let stop: boolean = false;
      (async () => {
        for await (const actionStatePair of actions()) {
          if (stop) {
            break;
          }
          // eslint-disable-next-line no-console
          console.log(
            'action',
            JSON.stringify(actionStatePair.action, null, 2),
            'state',
            JSON.stringify(actionStatePair.state, null, 2)
          );
        }
      })();
      return () => {
        stop = true;
      };
    },
  };
};
