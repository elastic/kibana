/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { ENTITY_FETCH_STATUS, useEntityManager } from '../../hooks/use_entity_manager';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
  entityManagerEnablementStatus: ENTITY_FETCH_STATUS;
  isEnablementPending: boolean;
  refetch: () => void;
}

export const EntityManagerEnablementContext = createContext(
  {} as EntityManagerEnablementContextValue
);

export function EntityManagerEnablementContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { isEnabled, status, refetch } = useEntityManager();

  return (
    <EntityManagerEnablementContext.Provider
      value={{
        isEntityManagerEnabled: isEnabled,
        entityManagerEnablementStatus: status,
        isEnablementPending: status === ENTITY_FETCH_STATUS.LOADING,
        refetch,
      }}
    >
      {children}
    </EntityManagerEnablementContext.Provider>
  );
}
