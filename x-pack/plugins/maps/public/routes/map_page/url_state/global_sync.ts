/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import type {
  RefreshInterval,
  TimeRange,
} from '../../../../../../../src/plugins/data/common/query/timefilter/types';
import { syncQueryStateWithUrl } from '../../../../../../../src/plugins/data/public/query/state_sync/sync_state_with_url';
import { getData } from '../../../kibana_services';
import { kbnUrlStateStorage } from '../../../render_app';

export interface MapsGlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
}

export function startGlobalStateSyncing() {
  const { stop } = syncQueryStateWithUrl(getData().query, kbnUrlStateStorage);
  return stop;
}

export function getGlobalState(): MapsGlobalState {
  return kbnUrlStateStorage.get('_g') as MapsGlobalState;
}

export function updateGlobalState(newState: MapsGlobalState, flushUrlState = false) {
  const globalState = getGlobalState();
  kbnUrlStateStorage.set('_g', {
    ...globalState,
    ...newState,
  });
  if (flushUrlState) {
    kbnUrlStateStorage.kbnUrlControls.flush(true);
  }
}
