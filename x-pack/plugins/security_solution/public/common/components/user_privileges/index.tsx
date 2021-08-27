/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { DeepReadonly } from 'utility-types';
import { useGetUserAlertsPermissions } from '@kbn/alerts';

import { Capabilities } from '../../../../../../../src/core/public';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { EndpointPrivileges, useEndpointPrivileges } from './use_endpoint_privileges';

import { SERVER_APP_ID } from '../../../../common/constants';
export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
  endpointPrivileges: EndpointPrivileges;
  alertsPrivileges: ReturnType<typeof useGetUserAlertsPermissions>;
}

export const initialUserPrivilegesState = (): UserPrivilegesState => ({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
  endpointPrivileges: { loading: true, canAccessEndpointManagement: false, canAccessFleet: false },
  alertsPrivileges: { loading: false, read: false, crud: false },
});

const UserPrivilegesContext = createContext<UserPrivilegesState>(initialUserPrivilegesState());

interface UserPrivilegesProviderProps {
  kibanaCapabilities: Capabilities;
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({
  kibanaCapabilities,
  children,
}: UserPrivilegesProviderProps) => {
  const listPrivileges = useFetchListPrivileges();
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges();
  const endpointPrivileges = useEndpointPrivileges();
  const alertsPrivileges = useGetUserAlertsPermissions(kibanaCapabilities, SERVER_APP_ID);
  return (
    <UserPrivilegesContext.Provider
      value={{
        listPrivileges,
        detectionEnginePrivileges,
        endpointPrivileges,
        alertsPrivileges,
      }}
    >
      {children}
    </UserPrivilegesContext.Provider>
  );
};

export const useUserPrivileges = (): DeepReadonly<UserPrivilegesState> =>
  useContext(UserPrivilegesContext);
