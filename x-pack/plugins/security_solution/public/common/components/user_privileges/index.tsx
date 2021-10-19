/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DeepReadonly } from 'utility-types';

import { Capabilities } from '../../../../../../../src/core/public';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { EndpointPrivileges, useEndpointPrivileges } from './endpoint';

import { SERVER_APP_ID } from '../../../../common/constants';
import { getEndpointPrivilegesInitialState } from './endpoint/utils';
export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
  endpointPrivileges: EndpointPrivileges;
  kibanaSecuritySolutionsPrivileges: { crud: boolean; read: boolean };
}

export const initialUserPrivilegesState = (): UserPrivilegesState => ({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
  endpointPrivileges: getEndpointPrivilegesInitialState(),
  kibanaSecuritySolutionsPrivileges: { crud: false, read: false },
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
  const [kibanaSecuritySolutionsPrivileges, setKibanaSecuritySolutionsPrivileges] = useState({
    crud: false,
    read: false,
  });
  const crud: boolean = kibanaCapabilities[SERVER_APP_ID].crud === true;
  const read: boolean = kibanaCapabilities[SERVER_APP_ID].show === true;

  useEffect(() => {
    setKibanaSecuritySolutionsPrivileges((currPrivileges) => {
      if (currPrivileges.read !== read || currPrivileges.crud !== crud) {
        return { read, crud };
      }
      return currPrivileges;
    });
  }, [crud, read]);

  return (
    <UserPrivilegesContext.Provider
      value={{
        listPrivileges,
        detectionEnginePrivileges,
        endpointPrivileges,
        kibanaSecuritySolutionsPrivileges,
      }}
    >
      {children}
    </UserPrivilegesContext.Provider>
  );
};

export const useUserPrivileges = (): DeepReadonly<UserPrivilegesState> =>
  useContext(UserPrivilegesContext);
