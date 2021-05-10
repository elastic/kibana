/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useFetchDetectionEnginePrivileges } from './use_fetch_detection_engine_privileges';
import { useFetchListPrivileges } from './use_fetch_list_privileges';

export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
}

const UserPrivilegesContext = createContext<UserPrivilegesState>({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
});

interface UserPrivilegesProviderProps {
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({ children }: UserPrivilegesProviderProps) => {
  const listPrivileges = useFetchListPrivileges();
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges();

  return (
    <UserPrivilegesContext.Provider
      value={{
        listPrivileges,
        detectionEnginePrivileges,
      }}
    >
      {children}
    </UserPrivilegesContext.Provider>
  );
};

export const useUserPrivileges = () => useContext(UserPrivilegesContext);
