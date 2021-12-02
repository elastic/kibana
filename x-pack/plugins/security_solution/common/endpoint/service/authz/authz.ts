/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseService } from '../../../license';
import { FleetAuthz } from '../../../../../fleet/common';
import { EndpointAuthz } from '../../types/authz';

/**
 * Used by both the server and the UI to generate the Authorization for access to Endpoint related
 * functionality
 *
 * @param licenseService
 * @param fleetAuthz
 */
export const calculateEndpointAuthz = (
  licenseService: LicenseService,
  fleetAuthz: FleetAuthz
): EndpointAuthz => {
  const isPlatinumPlusLicense = licenseService.isPlatinumPlus();
  const hasAllAccessToFleet = fleetAuthz.fleet.all;

  return {
    canAccessFleet: hasAllAccessToFleet,
    canAccessEndpointManagement: hasAllAccessToFleet,
    canCreateArtifactsByPolicy: isPlatinumPlusLicense,
    canIsolateHost: isPlatinumPlusLicense && hasAllAccessToFleet,
    canUnIsolateHost: true,
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
