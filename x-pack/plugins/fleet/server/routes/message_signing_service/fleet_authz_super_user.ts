/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_PRIVILEGES } from '../../../common';
import { calculatePackagePrivilegesFromCapabilities } from '../../../common/authz';
import type { FleetRouteRequiredAuthz } from '../../services/security';

export const getFleetAuthzRequiredForSuperUser = (): FleetRouteRequiredAuthz => {
  const endpointCapabilities = Object.entries(ENDPOINT_PRIVILEGES).reduce(
    (acc, [_, { privilegeName }]) => {
      return {
        ...acc,
        [privilegeName]: true,
      };
    },
    {}
  );

  const packagePrivileges = calculatePackagePrivilegesFromCapabilities({
    navLinks: {},
    management: {},
    catalogue: {},
    siem: endpointCapabilities,
  });

  return {
    all: {
      fleet: {
        all: true,
        setup: true,
        readEnrollmentTokens: true,
        readAgentPolicies: true,
      },
      integrations: {
        readPackageInfo: true,
        readInstalledPackages: true,
        installPackages: true,
        upgradePackages: true,
        uploadPackages: true,
        removePackages: true,
        readPackageSettings: true,
        writePackageSettings: true,
        readIntegrationPolicies: true,
        writeIntegrationPolicies: true,
      },
      packagePrivileges,
    },
  } as FleetRouteRequiredAuthz;
};
