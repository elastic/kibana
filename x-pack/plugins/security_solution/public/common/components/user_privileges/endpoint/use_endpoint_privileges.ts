/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser, useHttp } from '../../../lib/kibana';
import { appRoutesService, CheckPermissionsResponse } from '../../../../../../fleet/common';
import { useLicense } from '../../../hooks/use_license';

export interface EndpointPrivileges {
  loading: boolean;
  /** If user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
  /** if user has permissions to create Artifacts by Policy */
  canCreateArtifactsByPolicy: boolean;
  /** If user has permissions to use the Host isolation feature */
  canIsolateHost: boolean;
  /** @deprecated do not use. instead, use one of the other privileges defined */
  isPlatinumPlus: boolean;
}

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): EndpointPrivileges => {
  const http = useHttp();
  const user = useCurrentUser();
  const isMounted = useRef<boolean>(true);
  const isPlatinumPlusLicense = useLicense().isPlatinumPlus();
  const [canAccessFleet, setCanAccessFleet] = useState<boolean>(false);
  const [fleetCheckDone, setFleetCheckDone] = useState<boolean>(false);

  // Check if user can access fleet
  useEffect(() => {
    (async () => {
      try {
        const fleetPermissionsResponse = await http.get<CheckPermissionsResponse>(
          appRoutesService.getCheckPermissionsPath()
        );

        if (isMounted.current) {
          setCanAccessFleet(fleetPermissionsResponse.success);
        }
      } finally {
        if (isMounted.current) {
          setFleetCheckDone(true);
        }
      }
    })();
  }, [http]);

  // Check if user has `superuser` role
  const isSuperUser = useMemo(() => {
    if (user?.roles) {
      return user.roles.includes('superuser');
    }
    return false;
  }, [user?.roles]);

  const privileges = useMemo(() => {
    const privilegeList: EndpointPrivileges = {
      loading: !fleetCheckDone || !user,
      canAccessFleet,
      canAccessEndpointManagement: canAccessFleet && isSuperUser,
      canCreateArtifactsByPolicy: isPlatinumPlusLicense,
      canIsolateHost: isPlatinumPlusLicense,
      // FIXME: Remove usages of the property below
      /** @deprecated */
      isPlatinumPlus: isPlatinumPlusLicense,
    };

    return privilegeList;
  }, [canAccessFleet, fleetCheckDone, isSuperUser, user, isPlatinumPlusLicense]);

  // Capture if component is unmounted
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  return privileges;
};
