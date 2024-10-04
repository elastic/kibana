/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { entityCentricExperience } from '@kbn/observability-plugin/common';
import React, { createContext } from 'react';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { ENTITY_FETCH_STATUS, useEntityManager } from './use_entity_manager';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
  isEnablementPending: boolean;
  refetch: () => void;
  serviceInventoryViewLocalStorageSetting: ServiceInventoryView;
  setServiceInventoryViewLocalStorageSetting: (view: ServiceInventoryView) => void;
  isEntityCentricExperienceViewEnabled: boolean;
}

export enum ServiceInventoryView {
  classic = 'classic',
  entity = 'entity',
}

export const EntityManagerEnablementContext = createContext(
  {} as EntityManagerEnablementContextValue
);

const SERVICE_INVENTORY_STORAGE_KEY = 'apm.service.inventory.view';

export function EntityManagerEnablementContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { core } = useApmPluginContext();
  const { isEnabled: isEntityManagerEnabled, status, refetch } = useEntityManager();
  const [serviceInventoryViewLocalStorageSetting, setServiceInventoryViewLocalStorageSetting] =
    useLocalStorage(SERVICE_INVENTORY_STORAGE_KEY, ServiceInventoryView.classic);

  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get<boolean>(
    entityCentricExperience,
    true
  );

  function handleServiceInventoryViewChange(nextView: ServiceInventoryView) {
    setServiceInventoryViewLocalStorageSetting(nextView);
  }

  return (
    <EntityManagerEnablementContext.Provider
      value={{
        isEntityManagerEnabled,
        isEnablementPending: status === ENTITY_FETCH_STATUS.LOADING,
        refetch,
        serviceInventoryViewLocalStorageSetting,
        setServiceInventoryViewLocalStorageSetting: handleServiceInventoryViewChange,
        isEntityCentricExperienceViewEnabled: isEntityCentricExperienceSettingEnabled,
      }}
    >
      {children}
    </EntityManagerEnablementContext.Provider>
  );
}
