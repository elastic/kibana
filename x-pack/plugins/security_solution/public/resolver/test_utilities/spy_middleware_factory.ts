/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverAction } from '../store/actions';
import { SpyMiddleware, SpyMiddlewareStateActionPair } from '../types';

/**
 * Return a `SpyMiddleware` to be used in testing. Use `debugActions` to console.log actions and the state they produced.
 * For reducer/middleware tests, you can use `actions` to get access to each dispatched action along w/ the state it produced.
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
    middleware: (api) => (next) => (action: ResolverAction) => {
      const state = api.getState();
      const oldResolvers = [...resolvers];
      resolvers.clear();
      for (const resolve of oldResolvers) {
        resolve({ action, state });
      }

      next(action);
    },
    actions,
    debugActions() {
      let stop: boolean = false;
      (async () => {
        for await (const action of actions()) {
          if (stop) {
            break;
          }
          // eslint-disable-next-line no-console
          console.log('action', action);
        }
      })();
      return () => {
        stop = true;
      };
    },
  };
};
