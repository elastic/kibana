/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { distinctUntilChanged } from 'rxjs/operators';

export function initializeAppState(AppState, stateName, defaultState) {
  const appState = new AppState();
  appState.fetch();

  // Store the state to the AppState so that it's
  // restored on page refresh.
  if (appState[stateName] === undefined) {
    appState[stateName] = _.cloneDeep(defaultState) || {};
    appState.save();
  }

  // If defaultState is defined, check if the keys of the defaultState
  // match the one from appState, if not, fall back to the defaultState.
  // If we didn't do this, the structure of an out-of-date appState
  // might break some follow up code. Note that this will not catch any
  // deeper nested inconsistencies.
  if (typeof defaultState !== 'undefined' && appState[stateName] !== defaultState) {
    if (!_.isEqual(
      Object.keys(defaultState).sort(),
      Object.keys(appState[stateName]).sort()
    )) {
      appState[stateName] = _.cloneDeep(defaultState);
      appState.save();
    }
  }

  return appState;
}

export function subscribeAppStateToObservable(AppState, APP_STATE_NAME, APP_STATE_SUB_NAME, o$, $rootScope) {
  const appState = initializeAppState(AppState, APP_STATE_NAME, {
    [APP_STATE_SUB_NAME]: o$.getValue()
  });

  o$.next(appState[APP_STATE_NAME][APP_STATE_SUB_NAME]);

  o$.pipe(distinctUntilChanged()).subscribe(payload => {
    appState.fetch();
    appState[APP_STATE_NAME] = { [APP_STATE_SUB_NAME]: payload };
    appState.save();
    $rootScope.$applyAsync();
  });
}
