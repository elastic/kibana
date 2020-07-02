/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connectToQueryState, esFilters } from '../../../../../../src/plugins/data/public';
import { syncState } from '../../../../../../src/plugins/kibana_utils/public';
import { map } from 'rxjs/operators';
import { getData } from '../../kibana_services';
import { kbnUrlStateStorage } from '../maps_router';

export function useAppStateSyncing(appStateManager) {
  // get appStateContainer
  // sync app filters with app state container from data.query to state container
  const { query } = getData();

  const stateContainer = {
    get: () => ({
      query: appStateManager.getQuery(),
      filters: appStateManager.getFilters(),
    }),
    set: (state) =>
      state && appStateManager.setQueryAndFilters({ query: state.query, filters: state.filters }),
    state$: appStateManager._updated$.pipe(
      map(() => ({
        query: appStateManager.getQuery(),
        filters: appStateManager.getFilters(),
      }))
    ),
  };
  const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(query, stateContainer, {
    filters: esFilters.FilterStateStore.APP_STATE,
  });

  // sets up syncing app state container with url
  const { start: startSyncingAppStateWithUrl, stop: stopSyncingAppStateWithUrl } = syncState({
    storageKey: '_a',
    stateStorage: kbnUrlStateStorage,
    stateContainer,
  });

  // merge initial state from app state container and current state in url
  const initialAppState = {
    ...stateContainer.get(),
    ...kbnUrlStateStorage.get('_a'),
  };
  // trigger state update. actually needed in case some data was in url
  stateContainer.set(initialAppState);

  // set current url to whatever is in app state container
  kbnUrlStateStorage.set('_a', initialAppState);

  // finally start syncing state containers with url
  startSyncingAppStateWithUrl();

  return () => {
    stopSyncingQueryAppStateWithStateContainer();
    stopSyncingAppStateWithUrl();
  };
}
