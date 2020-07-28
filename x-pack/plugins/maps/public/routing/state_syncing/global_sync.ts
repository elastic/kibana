/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { syncQueryStateWithUrl } from '../../../../../../src/plugins/data/public';
import { getData } from '../../kibana_services';
// @ts-ignore
import { kbnUrlStateStorage } from '../maps_router';

export function useGlobalStateSyncing() {
  const { stop } = syncQueryStateWithUrl(getData().query, kbnUrlStateStorage);
  return stop;
}

export function getGlobalState() {
  return kbnUrlStateStorage.get('_g');
}

export function updateGlobalState(newState: unknown, flushUrlState = false) {
  const globalState = getGlobalState();
  kbnUrlStateStorage.set('_g', {
    // @ts-ignore
    ...globalState,
    // @ts-ignore
    ...newState,
  });
  if (flushUrlState) {
    kbnUrlStateStorage.flush({ replace: true });
  }
}
