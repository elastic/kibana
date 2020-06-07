/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

export interface UseSecurityLocalStorage {
  getCallouts: (plugin: string) => string[];
  persistDismissCallout: (plugin: string, id: string) => void;
}

export const useSecurityLocalStorage = (): UseSecurityLocalStorage => {
  const storage = new Storage(localStorage);

  const getCallouts = useCallback(
    (plugin: string): string[] => {
      return storage.get(plugin)?.callouts ?? [];
    },
    [storage]
  );

  const persistDismissCallout = useCallback(
    (plugin: string, id: string) => {
      const pluginStorage = storage.get(plugin) ?? { callouts: [] };
      storage.set(plugin, { ...pluginStorage, callouts: [...pluginStorage.callouts, id] });
    },
    [storage]
  );

  return {
    persistDismissCallout,
    getCallouts,
  };
};
