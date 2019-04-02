/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { routes } from '../../apps';
import { historyProvider } from '../../lib/history_provider';
import { routerProvider } from '../../lib/router_provider';
import { get as fetchWorkpad } from '../../lib/workpad_service';
import { restoreHistory, undoHistory, redoHistory } from '../actions/history';
import { initializeWorkpad } from '../actions/workpad';
import { setAssets } from '../actions/assets';
import { isAppReady } from '../selectors/app';
import { getWorkpad } from '../selectors/workpad';

function getHistoryState(state) {
  // this is what gets written to browser history
  return state.persistent;
}

export const historyMiddleware = ({ dispatch, getState }) => {
  // iterate over routes, injecting redux to action handlers
  const reduxInject = routes => {
    return routes.map(route => {
      if (route.children) {
        return {
          ...route,
          children: reduxInject(route.children),
        };
      }

      if (!route.action) {
        return route;
      }

      return {
        ...route,
        action: route.action(dispatch, getState),
      };
    });
  };

  const handlerState = {
    pendingCount: 0,
  };

  // wrap up the application route actions in redux
  const router = routerProvider(reduxInject(routes));
  const history = historyProvider();

  // wire up history change handler (this only happens once)
  const handleHistoryChanges = async (location, prevLocation) => {
    const { pathname, state: historyState, action: historyAction } = location;
    // pop state will fire on any hash-based url change, but only back/forward will have state
    const isBrowserNav = historyAction === 'pop' && historyState != null;
    const isUrlChange =
      (!isBrowserNav && historyAction === 'pop') ||
      ((historyAction === 'push' || historyAction === 'replace') &&
        prevLocation.pathname !== pathname);

    // only restore the history on popState events with state
    // this only happens when using back/forward with popState objects
    if (isBrowserNav) {
      // TODO: oof, this sucks. we can't just shove assets into history state because
      // firefox is limited to 640k (wat!). so, when we see that the workpad id is changing,
      // we instead just restore the assets, which ensures the overall state is correct.
      // there must be a better way to handle history though...
      const currentWorkpadId = getWorkpad(getState()).id;
      if (currentWorkpadId !== historyState.workpad.id) {
        const newWorkpad = await fetchWorkpad(historyState.workpad.id);
        dispatch(setAssets(newWorkpad.assets));
      }

      return dispatch(restoreHistory(historyState));
    }

    // execute route action on pushState and popState events
    if (isUrlChange) {
      return await router.parse(pathname);
    }
  };

  history.onChange(async (...args) => {
    // use history replace until any async handlers are completed
    handlerState.pendingCount += 1;

    try {
      await handleHistoryChanges(...args);
    } catch (e) {
      // TODO: handle errors here
    } finally {
      // restore default history method
      handlerState.pendingCount -= 1;
    }
  });

  return next => action => {
    const oldState = getState();

    // deal with history actions
    switch (action.type) {
      case undoHistory.toString():
        return history.undo();
      case redoHistory.toString():
        return history.redo();
      case restoreHistory.toString():
        // skip state compare, simply execute the action
        next(action);
        // TODO: we shouldn't need to reset the entire workpad for undo/redo
        dispatch(initializeWorkpad());
        return;
    }

    // execute the action like normal
    next(action);
    const newState = getState();

    // if the app is not ready, don't persist anything
    if (!isAppReady(newState)) {
      return;
    }

    // if app switched from not ready to ready, replace current state
    // this allows the back button to work correctly all the way to first page load
    if (!isAppReady(oldState) && isAppReady(newState)) {
      history.replace(getHistoryState(newState));
      return;
    }

    // if the persistent state changed, push it into the history
    const oldHistoryState = getHistoryState(oldState);
    const historyState = getHistoryState(newState);
    if (!isEqual(historyState, oldHistoryState)) {
      // if there are pending route changes, just replace current route (to avoid extra back/forth history entries)
      const useReplaceState = handlerState.pendingCount !== 0;
      useReplaceState ? history.replace(historyState) : history.push(historyState);
    }
  };
};
