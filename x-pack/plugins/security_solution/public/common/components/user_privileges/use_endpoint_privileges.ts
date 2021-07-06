/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useCurrentUser, useHttp } from '../../lib/kibana';
import { appRoutesService, CheckPermissionsResponse } from '../../../../../fleet/common';

export interface EndpointPrivileges {
  loading: boolean;
  /** If user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
}

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePriviliges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): EndpointPrivileges => {
  const http = useHttp();
  const user = useCurrentUser();
  const isMounted = useRef<boolean>(true);
  const [privileges, setPrivileges] = useState<EndpointPrivileges>({
    loading: true,
    canAccessFleet: false,
    canAccessEndpointManagement: false,
  });
  const [canAccessFleet, setCanAccessFleet] = useState<boolean>(false);
  const [isSuperUser, setIsSuperUser] = useState<boolean>(false);
  const [fleetCheckDone, setFleetCheckDone] = useState<boolean>(false);
  const [userRoleCheckDone, setUserRoleCheckDone] = useState<boolean>(false);

  // Check if user can access fleet
  useEffect(() => {
    (async () => {
      http
        .get<CheckPermissionsResponse>(appRoutesService.getCheckPermissionsPath())
        .then((fleetPermissionsResponse) => {
          if (isMounted.current) {
            setCanAccessFleet(fleetPermissionsResponse.success);
          }
        })
        .finally(() => {
          if (isMounted.current) {
            setFleetCheckDone(true);
          }
        });
    })();
  }, [http]);

  // Check if user has `superuser` permissions
  useEffect(() => {
    if (user && isMounted.current) {
      setIsSuperUser(user.roles.includes('superuser'));
      setUserRoleCheckDone(true);
    }
  }, [privileges.canAccessFleet, user]);

  useEffect(() => {
    if (isMounted.current) {
      setPrivileges({
        loading: !fleetCheckDone || !userRoleCheckDone,
        canAccessFleet,
        canAccessEndpointManagement: canAccessFleet && isSuperUser,
      });
    }
  }, [canAccessFleet, fleetCheckDone, isSuperUser, userRoleCheckDone]);

  // Capture if component is unmounted
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  return privileges;
};
