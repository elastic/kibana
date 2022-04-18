/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useEffect, useState } from 'react';
import { Capabilities } from '@kbn/core/types';
import { SERVER_APP_ID } from '../../../../common/constants';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { getEndpointPrivilegesInitialState, useEndpointPrivileges } from './endpoint';
import { EndpointPrivileges } from '../../../../common/endpoint/types';

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
export const UserPrivilegesContext = createContext<UserPrivilegesState>(
  initialUserPrivilegesState()
);

interface UserPrivilegesProviderProps {
  kibanaCapabilities: Capabilities;
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({
  kibanaCapabilities,
  children,
}: UserPrivilegesProviderProps) => {
  const crud: boolean = kibanaCapabilities[SERVER_APP_ID].crud === true;
  const read: boolean = kibanaCapabilities[SERVER_APP_ID].show === true;
  const [kibanaSecuritySolutionsPrivileges, setKibanaSecuritySolutionsPrivileges] = useState({
    crud,
    read,
  });

  const listPrivileges = useFetchListPrivileges(read);
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges(read);
  const endpointPrivileges = useEndpointPrivileges();

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
