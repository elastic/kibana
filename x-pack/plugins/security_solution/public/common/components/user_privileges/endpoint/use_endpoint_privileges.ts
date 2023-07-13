/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { isEmpty } from 'lodash';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useCurrentUser, useKibana } from '../../../lib/kibana';
import { useLicense } from '../../../hooks/use_license';
import type {
  EndpointPrivileges,
  Immutable,
  MaybeImmutable,
} from '../../../../../common/endpoint/types';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../../../../../common/endpoint/service/authz';
import { useSecuritySolutionStartDependencies } from './security_solution_start_dependencies';

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): Immutable<EndpointPrivileges> => {
  const isMounted = useIsMounted();
  const user = useCurrentUser();

  const kibanaServices = useKibana().services;
  const fleetServicesFromUseKibana = kibanaServices.fleet;
  // The `fleetServicesFromPluginStart` will be defined when this hooks called from a component
  // that is being rendered under the Fleet context (UI extensions). The `fleetServicesFromUseKibana`
  // above will be `undefined` in this case.
  const fleetServicesFromPluginStart = useSecuritySolutionStartDependencies()?.fleet;
  const fleetAuthz = fleetServicesFromUseKibana?.authz ?? fleetServicesFromPluginStart?.authz;

  const licenseService = useLicense();

  const [userRolesCheckDone, setUserRolesCheckDone] = useState<boolean>(false);
  const [userRoles, setUserRoles] = useState<MaybeImmutable<string[]>>([]);

  const privileges = useMemo(() => {
    const loading = !userRolesCheckDone || !user;

    const privilegeList: EndpointPrivileges = Object.freeze({
      loading,
      ...(!loading && fleetAuthz && !isEmpty(user)
        ? calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)
        : getEndpointAuthzInitialState()),
    });
    return privilegeList;
  }, [userRolesCheckDone, user, fleetAuthz, licenseService, userRoles]);

  // get user roles
  useEffect(() => {
    (async () => {
      if (user && isMounted()) {
        setUserRoles(user?.roles);
        setUserRolesCheckDone(true);
      }
    })();
  }, [isMounted, user]);

  return privileges;
};
