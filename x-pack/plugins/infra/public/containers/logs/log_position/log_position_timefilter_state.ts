/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INullableBaseStateContainer, syncState } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useState } from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import {
  createTimefilterStateStorage,
  TimefilterState,
  timefilterStateStorageKey,
} from '../../../utils/timefilter_state_storage';

export const useLogPositionTimefilterStateSync = () => {
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useKibanaContextForPlugin();

  const [timefilterStateStorage] = useState(() => createTimefilterStateStorage({ timefilter }));

  const [initialStateFromTimefilter] = useState(() =>
    timefilterStateStorage.get(timefilterStateStorageKey)
  );

  const startSyncingWithTimefilter = useCallback(
    (stateContainer: INullableBaseStateContainer<TimefilterState>) => {
      timefilterStateStorage.set(timefilterStateStorageKey, stateContainer.get());

      const { start, stop } = syncState({
        storageKey: timefilterStateStorageKey,
        stateContainer,
        stateStorage: timefilterStateStorage,
      });

      start();

      return stop;
    },
    [timefilterStateStorage]
  );

  return {
    initialStateFromTimefilter,
    startSyncingWithTimefilter,
  };
};
