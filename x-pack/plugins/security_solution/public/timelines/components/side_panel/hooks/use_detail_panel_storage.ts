/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

const LOCAL_STORAGE_DETAILS_PANEL_KEY = 'securitySolution:detailsPanel';

interface DetailPanelStorage {
  fieldTablePageSize: number;
}

export const useDetailPanelStorage = () => {
  // Currently storage is just localStorage as set in x-pack/plugins/security_solution/public/plugin.tsx
  // In the event the storage mechanism ever changes, this should afford us to just change it in one place
  // And track usage throughout the application
  const { storage } = useKibana().services;

  const getDetailPanelStorage = useCallback<() => DetailPanelStorage>(() => {
    return storage.get(LOCAL_STORAGE_DETAILS_PANEL_KEY) ?? {};
  }, [storage]);

  const setDetailPanelStorage = useCallback(
    (update: DetailPanelStorage) => {
      const currentDetailPanelStorage = getDetailPanelStorage();
      storage.set(LOCAL_STORAGE_DETAILS_PANEL_KEY, {
        ...currentDetailPanelStorage,
        ...update,
      });
    },
    [storage, getDetailPanelStorage]
  );

  return {
    getDetailPanelStorage,
    setDetailPanelStorage,
  };
};
