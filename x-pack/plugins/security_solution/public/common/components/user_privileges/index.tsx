/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { DeepReadonly } from 'utility-types';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { EndpointPrivileges, useEndpointPrivileges } from './use_endpoint_privileges';

export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
  endpointPrivileges: EndpointPrivileges;
}

export const initialUserPrivilegesState = (): UserPrivilegesState => ({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
  endpointPrivileges: { loading: true, canAccessEndpointManagement: false, canAccessFleet: false },
});

const UserPrivilegesContext = createContext<UserPrivilegesState>(initialUserPrivilegesState());

interface UserPrivilegesProviderProps {
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({ children }: UserPrivilegesProviderProps) => {
  const listPrivileges = useFetchListPrivileges();
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges();
  const endpointPrivileges = useEndpointPrivileges();

  return (
    <UserPrivilegesContext.Provider
      value={{
        listPrivileges,
        detectionEnginePrivileges,
        endpointPrivileges,
      }}
    >
      {children}
    </UserPrivilegesContext.Provider>
  );
};

export const useUserPrivileges = (): DeepReadonly<UserPrivilegesState> =>
  useContext(UserPrivilegesContext);
