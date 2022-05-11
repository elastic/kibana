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
  fleetAuthz: FleetAuthz,
  userRoles: MaybeImmutable<string[]>
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const hasAllAccessToFleet = userRoles.includes('superuser');

  return {
    canAccessFleet: hasAllAccessToFleet,
    canAccessEndpointManagement: hasAllAccessToFleet,
    canCreateArtifactsByPolicy: hasAllAccessToFleet && isPlatinumPlusLicense,
    canIsolateHost: isPlatinumPlusLicense && hasAllAccessToFleet,
    canUnIsolateHost: hasAllAccessToFleet,
  };
};

export const getEndpointAuthzInitialState = (): EndpointAuthz => {
  return {
    canAccessFleet: false,
    canAccessEndpointManagement: false,
    canCreateArtifactsByPolicy: false,
    canIsolateHost: false,
    canUnIsolateHost: true,
  };
};
