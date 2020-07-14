/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createRouter from '@scant/router';
import { getWindow } from './get_window';
import { historyProvider } from './history_provider';
import { getCurrentAppState, assignAppState } from './app_state';
import { modifyUrl } from './modify_url';

// used to make this provider a singleton
let router;

export function routerProvider(routes) {
  if (router) {
    return router;
  }

  const baseRouter = createRouter(routes);
  const history = historyProvider(getWindow());
  const componentListeners = [];

  // assume any string starting with a / is a path
  const isPath = (str) => typeof str === 'string' && str.substr(0, 1) === '/';

  // helper to get the current state in history
  const getState = (name, params, state) => {
    // given a path, assuming params is the state
    if (isPath(name)) {
      return params || history.getLocation().state;
    }
    return state || history.getLocation().state;
  };

  // helper to append appState to a given url path
  const appendAppState = (path, appState = getCurrentAppState()) => {
    const newUrl = modifyUrl(path, (parts) => {
      parts.query = assignAppState(parts.query, appState);
    });

    return newUrl;
  };

  // add or replace history with new url, either from path or derived path via name and params
  const updateLocation = (name, params, state, replace = false) => {
    const currentState = getState(name, params, state);
    const method = replace ? 'replace' : 'push';

    // given a path, go there directly
    if (isPath(name)) {
      return history[method](currentState, appendAppState(name));
    }

    history[method](currentState, appendAppState(baseRouter.create(name, params)));
  };

  // our router is an extended version of the imported router
  // which mixes in history methods for navigation
  router = {
    ...baseRouter,
    execute(path = history.getPath()) {
      return this.parse(path);
    },
    getPath: () => history.getPath(),
    getFullPath: () => history.getFullPath(),
    navigateTo(name, params, state) {
      updateLocation(name, params, state);
    },
    redirectTo(name, params, state) {
      updateLocation(name, params, state, true);
    },
    updateAppState(appState, replace = true) {
      const method = replace ? 'replace' : 'push';
      const newPath = appendAppState(this.getPath(), appState);
      const currentState = history.getLocation().state;
      history[method](currentState, newPath);
    },
    onPathChange(fn) {
      const execOnMatch = (location) => {
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
      const unlisten = history.onChange((locationObj, prevLocationObj) => {
        if (
          locationObj.pathname !== prevLocationObj.pathname ||
          locationObj.search !== prevLocationObj.search
        ) {
          execOnMatch(locationObj);
        }
      });

      // keep track of all change handler removal functions, for cleanup
      // TODO: clean up listeners when baseRounter.stop is called
      componentListeners.push(unlisten);

      // initially fire the path change handler
      execOnMatch(history.getLocation());

      return unlisten; // return function to remove change handler
    },
    stop: () => {
      for (const listener of componentListeners) {
        listener();
      }
    },
  };

  return router;
}

export const stopRouter = () => {
  if (router) {
    router.stop();
    router = undefined;
  }
};
