/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthz } from '@kbn/fleet-plugin/common';
import type { LicenseService } from '../../../license';
import type { EndpointAuthz } from '../../types/authz';
import type { MaybeImmutable } from '../../types';

/**
 * Used by both the server and the UI to generate the Authorization for access to Endpoint related
 * functionality
 *
 * @param licenseService
 * @param fleetAuthz
 * @param userRoles
 */
export const calculateEndpointAuthz = (
  licenseService: LicenseService,
  fleetAuthz: FleetAuthz | undefined, // TODO: Remove `undefined` type when `fleetAuthz` is needed and used.
  userRoles: MaybeImmutable<string[]>
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const isEnterpriseLicense = licenseService.isEnterprise();
  const hasEndpointManagementAccess = userRoles.includes('superuser');

  return {
    canAccessFleet: fleetAuthz?.fleet.all ?? userRoles.includes('superuser'),
    canAccessEndpointManagement: hasEndpointManagementAccess,
    canCreateArtifactsByPolicy: hasEndpointManagementAccess && isPlatinumPlusLicense,
    // Response Actions
    canIsolateHost: isPlatinumPlusLicense && hasEndpointManagementAccess,
    canUnIsolateHost: hasEndpointManagementAccess,
    canKillProcess: hasEndpointManagementAccess && isEnterpriseLicense,
    canSuspendProcess: hasEndpointManagementAccess && isEnterpriseLicense,
    canGetRunningProcesses: hasEndpointManagementAccess && isEnterpriseLicense,
    canAccessResponseConsole: hasEndpointManagementAccess && isEnterpriseLicense,
    canAccessResponseActionsHistory: hasEndpointManagementAccess && isEnterpriseLicense,
  };
};

export const getEndpointAuthzInitialState = (): EndpointAuthz => {
  return {
    canAccessFleet: false,
    canAccessEndpointManagement: false,
    canCreateArtifactsByPolicy: false,
    canIsolateHost: false,
    canUnIsolateHost: true,
    canKillProcess: false,
    canSuspendProcess: false,
    canGetRunningProcesses: false,
    canAccessResponseConsole: false,
    canAccessResponseActionsHistory: false,
  };
};
