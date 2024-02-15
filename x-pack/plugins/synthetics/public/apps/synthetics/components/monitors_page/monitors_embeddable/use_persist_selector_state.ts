/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { MonitorSelectorState, initialMonitorSelectorState } from './models';

export const usePersistSelectorState = () => {
  const [persistedState, setPersistedState] = useLocalStorage<MonitorSelectorState>(
    'xpack.synthetics.monitorScreenshotSES',
    initialMonitorSelectorState
  );

  const updatePersistedState = useCallback(
    (state: MonitorSelectorState) => {
      setPersistedState(state);
    },
    [setPersistedState]
  );

  return [persistedState, updatePersistedState] as const;
};
