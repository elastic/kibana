/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs/operators';
import { FilterStateStore } from '@kbn/es-query';
import { connectToQueryState } from '@kbn/data-plugin/public';
import { syncState, BaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import { getData } from '../../../kibana_services';
import { kbnUrlStateStorage } from '../../../render_app';
import { AppStateManager } from './app_state_manager';

export function startAppStateSyncing(appStateManager: AppStateManager) {
  // get appStateContainer
  // sync app filters with app state container from data.query to state container
  const { query } = getData();

  // Filter manager state persists across applications
  // clear app state filters to prevent application filters from other applications being transfered to maps
  query.filterManager.setAppFilters([]);

  const stateContainer: BaseStateContainer<any> = {
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
    filters: FilterStateStore.APP_STATE,
    query: true,
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
    // @ts-ignore
    ...kbnUrlStateStorage.get('_a'),
  };
  // trigger state update. actually needed in case some data was in url
  stateContainer.set(initialAppState);

  // set current url to whatever is in app state container
  kbnUrlStateStorage.set('_a', initialAppState, {
    replace: true,
  });

  // finally start syncing state containers with url
  startSyncingAppStateWithUrl();

  return () => {
    stopSyncingQueryAppStateWithStateContainer();
    stopSyncingAppStateWithUrl();
  };
}
