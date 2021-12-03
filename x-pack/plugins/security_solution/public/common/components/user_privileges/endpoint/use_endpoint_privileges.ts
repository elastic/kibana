/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { useCurrentUser, useHttp, useKibana } from '../../../lib/kibana';
import { appRoutesService, CheckPermissionsResponse } from '../../../../../../fleet/common';
import { useLicense } from '../../../hooks/use_license';
import { Immutable } from '../../../../../common/endpoint/types';

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
  /** If user has permissions to unisolate a host */
  canUnisolateHost: boolean;
  /** If user has permission to view/access activity log */
  canAccessActivityLog: boolean;
  /** @deprecated do not use. instead, use one of the other privileges defined */
  isPlatinumPlus: boolean;
}

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): Immutable<EndpointPrivileges> => {
  const http = useHttp();
  const user = useCurrentUser();
  const isPlatinumPlusLicense = useLicense().isPlatinumPlus();
  let canAccessFleet = false;

  const services = useKibana().services;
  const pluginUserPrivileges = services.application.capabilities.securitySolutionEndpoint;
  const hasIsolationPrivilege = !!pluginUserPrivileges.writeIsolationActions;

  // Check if user can access fleet
  const {
    data: fleetPermissions,
    isLoading,
    isFetched,
  } = useQuery<CheckPermissionsResponse>(
    'fleetPermissions',
    async () => http.get<CheckPermissionsResponse>(appRoutesService.getCheckPermissionsPath()),
    { refetchOnMount: true }
  );

  if (isFetched && typeof fleetPermissions !== 'undefined') {
    canAccessFleet = fleetPermissions.success;
  }

  // Check if user has `superuser` role
  const isSuperUser = useMemo(() => user.roles.includes('superuser'), [user.roles]);

  const privileges = useMemo(() => {
    const privilegeList: EndpointPrivileges = Object.freeze({
      loading: isLoading,
      canAccessFleet,
      canAccessEndpointManagement: canAccessFleet && isSuperUser,
      canCreateArtifactsByPolicy: isPlatinumPlusLicense,
      // verify if also has write privileges for isolation/unisolation
      canIsolateHost: !(hasIsolationPrivilege && isPlatinumPlusLicense),
      canUnisolateHost: !hasIsolationPrivilege,
      // verify if can access activity log flyout
      canAccessActivityLog: !pluginUserPrivileges.readIsolationActionsAndResponses,
      // FIXME: Remove usages of the property below
      /** @deprecated */
      isPlatinumPlus: isPlatinumPlusLicense,
    });

    return privilegeList;
  }, [
    canAccessFleet,
    isLoading,
    isSuperUser,
    isPlatinumPlusLicense,
    hasIsolationPrivilege,
    pluginUserPrivileges,
  ]);

  return privileges;
};
