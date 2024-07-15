/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { ENTITY_FETCH_STATUS, useEntityManager } from '../../hooks/use_entity_manager';
import { useLocalStorage } from '../../hooks/use_local_storage';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
  entityManagerEnablementStatus: ENTITY_FETCH_STATUS;
  isEnablementPending: boolean;
  refetch: () => void;
  userServiceInventoryView: ServiceInventoryView;
  setUserServiceInventoryView: (view: ServiceInventoryView) => void;
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
  const { isEnabled, status, refetch } = useEntityManager();

  const [userServiceInventoryView, setUserServiceInventoryView] = useLocalStorage(
    serviceInventoryStorageKey,
    ServiceInventoryView.classic
  );

  return (
    <EntityManagerEnablementContext.Provider
      value={{
        isEntityManagerEnabled: isEnabled,
        entityManagerEnablementStatus: status,
        isEnablementPending: status === ENTITY_FETCH_STATUS.LOADING,
        refetch,
        userServiceInventoryView,
        setUserServiceInventoryView,
      }}
    >
      {children}
    </EntityManagerEnablementContext.Provider>
  );
}
