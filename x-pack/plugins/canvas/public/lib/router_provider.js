/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createRouter from '@scant/router';
import { getWindow } from './get_window';
import { historyProvider } from './history_provider';

// used to make this provider a singleton
let router;

export function routerProvider(routes) {
  if (router) return router;

  const baseRouter = createRouter(routes);
  const history = historyProvider(getWindow());
  let componentListener = null;

  const isPath = str => typeof str === 'string' && str.substr(0, 1) === '/';

  const getState = (name, params, state) => {
    // given a path, assuming params is the state
    if (isPath(name)) return params || history.getLocation().state;
    return state || history.getLocation().state;
  };

  // our router is an extended version of the imported router
  // which mixes in history methods for navigation
  router = {
    ...baseRouter,
    execute(path = history.getPath()) {
      return this.parse(path);
    },
    getPath: history.getPath,
    getFullPath: history.getFullPath,
    navigateTo(name, params, state) {
      const currentState = getState(name, params, state);
      // given a path, go there directly
      if (isPath(name)) return history.push(currentState, name);
      history.push(currentState, this.create(name, params));
    },
    redirectTo(name, params, state) {
      const currentState = getState(name, params, state);
      // given a path, go there directly, assuming params is state
      if (isPath(name)) return history.replace(currentState, name);
      history.replace(currentState, this.create(name, params));
    },
    onPathChange(fn) {
      if (componentListener != null)
        throw new Error('Only one route component listener is allowed');

      const execOnMatch = location => {
        const { pathname } = location;
        const match = this.match(pathname);

        if (!match) {
          // TODO: show some kind of error, or redirect somewhere; maybe home?
          console.error('No route found for path: ', pathname);
          return;
        }

        fn({ ...match, location });
      };

      // on path changes, fire the path change handler
      componentListener = history.onChange((locationObj, prevLocationObj) => {
        if (locationObj.pathname !== prevLocationObj.pathname) execOnMatch(locationObj);
      });

      // initially fire the path change handler
      execOnMatch(history.getLocation());
    },
  };

  return router;
}
