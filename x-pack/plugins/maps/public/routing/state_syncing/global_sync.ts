/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { QueryState } from 'src/plugins/data/public';
import { syncQueryStateWithUrl } from '../../../../../../src/plugins/data/public';
import { getData } from '../../kibana_services';
import { kbnUrlStateStorage } from '../maps_router';

export function startGlobalStateSyncing() {
  const { stop } = syncQueryStateWithUrl(getData().query, kbnUrlStateStorage);
  return stop;
}

export function getGlobalState(): QueryState {
  return kbnUrlStateStorage.get('_g') as QueryState;
}

export function updateGlobalState(newState: QueryState, flushUrlState = false) {
  const globalState = getGlobalState();
  kbnUrlStateStorage.set('_g', {
    ...globalState,
    ...newState,
  });
  if (flushUrlState) {
    kbnUrlStateStorage.flush({ replace: true });
  }
}
