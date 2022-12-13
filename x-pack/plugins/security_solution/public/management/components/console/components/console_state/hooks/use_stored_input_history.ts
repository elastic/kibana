/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana';
import type { ConsoleDataState } from '../types';

interface InputHistoryOfflineStorage {
  version: number;
  data: ConsoleDataState['input']['history'];
}

const COMMAND_INPUT_HISTORY_KEY = 'commandInputHistory';

/**
 * The current version of the input history offline storage. Will help in the future
 * if we ever need to "migrate" stored data to a new format
 */
const CURRENT_VERSION = 1;

const getDefaultInputHistoryStorage = (): InputHistoryOfflineStorage => {
  return {
    version: CURRENT_VERSION,
    data: [],
  };
};

export const useStoredInputHistory = (
  storagePrefix: ConsoleDataState['storagePrefix']
): InputHistoryOfflineStorage['data'] => {
  const { storage } = useKibana().services;

  return useMemo<InputHistoryOfflineStorage['data']>(() => {
    if (storagePrefix) {
      const storedData =
        (storage.get(
          `${storagePrefix}.${COMMAND_INPUT_HISTORY_KEY}`
        ) as InputHistoryOfflineStorage) ?? getDefaultInputHistoryStorage();

      return storedData.data;
    }

    return [];
  }, [storage, storagePrefix]);
};

type SaveInputHistoryToStorageCallback = (data: InputHistoryOfflineStorage['data']) => void;

export const useSaveInputHistoryToStorage = (
  storagePrefix: ConsoleDataState['storagePrefix']
): SaveInputHistoryToStorageCallback => {
  const { storage } = useKibana().services;

  return useCallback(
    (data: InputHistoryOfflineStorage['data']) => {
      if (storagePrefix) {
        const update: InputHistoryOfflineStorage = {
          version: CURRENT_VERSION,
          data,
        };

        storage.set(`${storagePrefix}.${COMMAND_INPUT_HISTORY_KEY}`, update);
      }
    },
    [storage, storagePrefix]
  );
};
