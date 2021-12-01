/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser, useKibana } from '../../../lib/kibana';
import { useLicense } from '../../../hooks/use_license';
import { EndpointPrivileges, Immutable } from '../../../../../common/endpoint/types';

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): Immutable<EndpointPrivileges> => {
  const user = useCurrentUser();
  const fleetServices = useKibana().services.fleet;
  const isMounted = useRef<boolean>(true);
  const isPlatinumPlusLicense = useLicense().isPlatinumPlus();
  const [canAccessFleet, setCanAccessFleet] = useState<boolean>(false);
  const [fleetCheckDone, setFleetCheckDone] = useState<boolean>(false);

  const privileges = useMemo(() => {
    const privilegeList: EndpointPrivileges = Object.freeze({
      loading: !fleetCheckDone || !user,
      canAccessFleet,
      canAccessEndpointManagement: canAccessFleet,
      canCreateArtifactsByPolicy: isPlatinumPlusLicense,
      canIsolateHost: isPlatinumPlusLicense,
    });

    return privilegeList;
  }, [canAccessFleet, fleetCheckDone, user, isPlatinumPlusLicense]);

  // Check if user can access fleet
  useEffect(() => {
    if (!fleetServices) {
      setFleetCheckDone(true);
      return;
    }

    setFleetCheckDone(false);

    (async () => {
      try {
        if (isMounted.current) {
          // FIXME: adjust once PR #119973 is merged, which has async method
          // const fleetAuthz = await fleetServices.authz();
          await new Promise((r) => setTimeout(r, 0)); // <<<< Emulate promise resolve above. Delete once PR 119973 is available
          const fleetAuthz = fleetServices.authz;

          // Fleet is still defined as an optional plugin, thus `fleetServices` might not be defined
          setCanAccessFleet(fleetAuthz.fleet.all);
        }
      } finally {
        if (isMounted.current) {
          setFleetCheckDone(true);
        }
      }
    })();
  }, [fleetServices]);

  // Capture if component is unmounted
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  return privileges;
};
