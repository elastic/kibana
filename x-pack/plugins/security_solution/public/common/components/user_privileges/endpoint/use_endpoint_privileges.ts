/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { checkArtifactHasData } from '../../../../management/services/exceptions_list/check_artifact_has_data';
import { HostIsolationExceptionsApiClient } from '../../../../management/pages/host_isolation_exceptions/host_isolation_exceptions_api_client';
import { useCurrentUser, useHttp, useKibana } from '../../../lib/kibana';
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
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): Immutable<EndpointPrivileges> => {
  const isMounted = useIsMounted();
  const http = useHttp();
  const user = useCurrentUser();

  const kibanaServices = useKibana().services;
  const fleetServicesFromUseKibana = kibanaServices.fleet;
  // The `fleetServicesFromPluginStart` will be defined when this hooks called from a component
  // that is being rendered under the Fleet context (UI extensions). The `fleetServicesFromUseKibana`
  // above will be `undefined` in this case.
  const fleetServicesFromPluginStart = useSecuritySolutionStartDependencies()?.fleet;
  const fleetAuthz = fleetServicesFromUseKibana?.authz ?? fleetServicesFromPluginStart?.authz;

  const licenseService = useLicense();
  const isPlatinumPlus = licenseService.isPlatinumPlus();

  const [userRolesCheckDone, setUserRolesCheckDone] = useState<boolean>(false);
  const [userRoles, setUserRoles] = useState<MaybeImmutable<string[]>>([]);

  const isEndpointRbacEnabled = useIsExperimentalFeatureEnabled('endpointRbacEnabled');
  const isEndpointRbacV1Enabled = useIsExperimentalFeatureEnabled('endpointRbacV1Enabled');

  const [checkHostIsolationExceptionsDone, setCheckHostIsolationExceptionsDone] =
    useState<boolean>(false);
  const [hasHostIsolationExceptionsItems, setHasHostIsolationExceptionsItems] =
    useState<boolean>(false);

  const privileges = useMemo(() => {
    const loading = !userRolesCheckDone || !user || !checkHostIsolationExceptionsDone;

    const privilegeList: EndpointPrivileges = Object.freeze({
      loading,
      ...(!loading && fleetAuthz
        ? calculateEndpointAuthz(
            licenseService,
            fleetAuthz,
            userRoles,
            isEndpointRbacEnabled || isEndpointRbacV1Enabled,
            hasHostIsolationExceptionsItems
          )
        : getEndpointAuthzInitialState()),
    });

    return privilegeList;
  }, [
    userRolesCheckDone,
    user,
    checkHostIsolationExceptionsDone,
    fleetAuthz,
    licenseService,
    userRoles,
    isEndpointRbacEnabled,
    isEndpointRbacV1Enabled,
    hasHostIsolationExceptionsItems,
  ]);

  // get user roles
  useEffect(() => {
    (async () => {
      if (user && isMounted()) {
        setUserRoles(user?.roles);
        setUserRolesCheckDone(true);
      }
    })();
  }, [isMounted, user]);

  // Check if Host Isolation Exceptions exist if license is not Platinum+
  useEffect(() => {
    if (!isPlatinumPlus) {
      // Reset these back to false. Case license is changed while the user is logged in.
      setHasHostIsolationExceptionsItems(false);
      setCheckHostIsolationExceptionsDone(false);

      checkArtifactHasData(HostIsolationExceptionsApiClient.getInstance(http))
        .then((hasData) => {
          if (isMounted()) {
            setHasHostIsolationExceptionsItems(hasData);
          }
        })
        .finally(() => {
          if (isMounted()) {
            setCheckHostIsolationExceptionsDone(true);
          }
        });
    } else {
      setHasHostIsolationExceptionsItems(true);
      setCheckHostIsolationExceptionsDone(true);
    }
  }, [http, isMounted, isPlatinumPlus]);

  return privileges;
};
