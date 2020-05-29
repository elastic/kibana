/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { syncQueryStateWithUrl } from '../../../../../../src/plugins/data/public';
import { IKbnUrlStateStorage } from '../../../../../../src/plugins/kibana_utils/public';
import { getData } from '../../kibana_services';

export function useGlobalStateSyncing(kbnUrlStateStorage: IKbnUrlStateStorage) {
  useEffect(() => {
    const { stop } = syncQueryStateWithUrl(getData().query, kbnUrlStateStorage);
    return () => {
      stop();
    };
  }, [kbnUrlStateStorage]);
}
