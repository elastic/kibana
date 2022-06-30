/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetAuthz } from '@kbn/fleet-plugin/common';
import { LicenseService } from '../../../license';
import { EndpointAuthz } from '../../types/authz';
import { MaybeImmutable } from '../../types';

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
  const hasEndpointManagementAccess = userRoles.includes('superuser');

  return {
    canAccessFleet: fleetAuthz?.fleet.all ?? userRoles.includes('superuser'),
    canAccessEndpointManagement: hasEndpointManagementAccess,
    canCreateArtifactsByPolicy: hasEndpointManagementAccess && isPlatinumPlusLicense,
    canIsolateHost: isPlatinumPlusLicense && hasEndpointManagementAccess,
    canUnIsolateHost: hasEndpointManagementAccess,
    canKillProcess: hasEndpointManagementAccess && isPlatinumPlusLicense,
    canSuspendProcess: hasEndpointManagementAccess && isPlatinumPlusLicense,
    canGetRunningProcesses: hasEndpointManagementAccess && isPlatinumPlusLicense,
    canAccessResponseConsole: hasEndpointManagementAccess && isPlatinumPlusLicense,
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
  };
};
