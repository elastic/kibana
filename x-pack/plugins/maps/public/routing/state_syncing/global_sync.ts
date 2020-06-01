/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { syncQueryStateWithUrl } from '../../../../../../src/plugins/data/public';
import { IKbnUrlStateStorage } from '../../../../../../src/plugins/kibana_utils/public';
import { getData } from '../../kibana_services';

export function useGlobalStateSyncing(kbnUrlStateStorage: IKbnUrlStateStorage) {
  const { stop } = syncQueryStateWithUrl(getData().query, kbnUrlStateStorage);
  return stop;
}

export function getGlobalState(kbnUrlStateStorage: IKbnUrlStateStorage) {
  return kbnUrlStateStorage.get('_g');
}

export function updateGlobalState(kbnUrlStateStorage: IKbnUrlStateStorage, newState: unknown) {
  const globalState = getGlobalState(kbnUrlStateStorage);
  kbnUrlStateStorage.set(
    '_g',
    {
      ...globalState,
      ...newState,
    },
    {
      replace: true,
    }
  );
}
