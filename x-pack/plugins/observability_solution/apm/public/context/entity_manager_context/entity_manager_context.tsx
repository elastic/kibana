/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { entityCentricExperience } from '@kbn/observability-plugin/common';
import { ENTITY_FETCH_STATUS, useEntityManager } from '../../hooks/use_entity_manager';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
  entityManagerEnablementStatus: ENTITY_FETCH_STATUS;
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

export const serviceInventoryStorageKey = 'apm.service.inventory.view';

export const EntityManagerEnablementContext = createContext(
  {} as EntityManagerEnablementContextValue
);

export function EntityManagerEnablementContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { core } = useApmPluginContext();
  const { isEnabled: isEntityManagerEnabled, status, refetch } = useEntityManager();

  const [serviceInventoryViewLocalStorageSetting, setServiceInventoryViewLocalStorageSetting] =
    useLocalStorage(serviceInventoryStorageKey, ServiceInventoryView.classic);

  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get<boolean>(
    entityCentricExperience,
    false
  );

  const isEntityCentricExperienceViewEnabled =
    isEntityManagerEnabled &&
    serviceInventoryViewLocalStorageSetting === ServiceInventoryView.entity &&
    isEntityCentricExperienceSettingEnabled;

  return (
    <EntityManagerEnablementContext.Provider
      value={{
        isEntityManagerEnabled,
        entityManagerEnablementStatus: status,
        isEnablementPending: status === ENTITY_FETCH_STATUS.LOADING,
        refetch,
        serviceInventoryViewLocalStorageSetting,
        setServiceInventoryViewLocalStorageSetting,
        isEntityCentricExperienceViewEnabled,
      }}
    >
      {children}
    </EntityManagerEnablementContext.Provider>
  );
}
