/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import type { KibanaRequest } from '@kbn/core/server';

import type { FleetAuthz } from '../../../common';
import { INTEGRATIONS_PLUGIN_ID } from '../../../common';
import {
  calculateAuthz,
  calculatePackagePrivilegesFromKibanaPrivileges,
} from '../../../common/authz';

import { appContextService } from '..';
import { ENDPOINT_PRIVILEGES, PLUGIN_ID } from '../../constants';

import type {
  FleetAuthzRequirements,
  FleetRouteRequiredAuthz,
  FleetAuthzRouteConfig,
} from './types';

export function checkSecurityEnabled() {
  return appContextService.getSecurityLicense().isEnabled();
}

export function checkSuperuser(req: KibanaRequest) {
  if (!checkSecurityEnabled()) {
    return false;
  }

  const security = appContextService.getSecurity();
  const user = security.authc.getCurrentUser(req);
  if (!user) {
    return false;
  }

  const userRoles = user.roles || [];
  if (!userRoles.includes('superuser')) {
    return false;
  }

  return true;
}

function getAuthorizationFromPrivileges(
  kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>,
  searchPrivilege: string
) {
  const privilege = kibanaPrivileges.find((p) => p.privilege.includes(searchPrivilege));
  return privilege ? privilege.authorized : false;
}

export async function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz> {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const endpointPrivileges = Object.entries(ENDPOINT_PRIVILEGES).map(
      ([_, { appId, privilegeType, privilegeName }]) => {
        if (privilegeType === 'ui') {
          return security.authz.actions[privilegeType].get(`${appId}`, `${privilegeName}`);
        }
        return security.authz.actions[privilegeType].get(`${appId}-${privilegeName}`);
      }
    );
    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get(`${PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${PLUGIN_ID}-setup`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-read`),
        ...endpointPrivileges,
      ],
    });
    const fleetAllAuth = getAuthorizationFromPrivileges(privileges.kibana, `${PLUGIN_ID}-all`);
    const intAllAuth = getAuthorizationFromPrivileges(
      privileges.kibana,
      `${INTEGRATIONS_PLUGIN_ID}-all`
    );
    const intReadAuth = getAuthorizationFromPrivileges(
      privileges.kibana,
      `${INTEGRATIONS_PLUGIN_ID}-read`
    );
    const fleetSetupAuth = getAuthorizationFromPrivileges(privileges.kibana, 'fleet-setup');

    return {
      ...calculateAuthz({
        fleet: { all: fleetAllAuth, setup: fleetSetupAuth },
        integrations: {
          all: intAllAuth,
          read: intReadAuth,
        },
        isSuperuser: checkSuperuser(req),
      }),
      packagePrivileges: calculatePackagePrivilegesFromKibanaPrivileges(privileges.kibana),
    };
  }

  return calculateAuthz({
    fleet: { all: false, setup: false },
    integrations: {
      all: false,
      read: false,
    },
    isSuperuser: false,
  });
}

interface RouteAuthz {
  /** Is route access granted (based on authz) */
  granted: boolean;

  /** Was authorization to the api a result of Fleet (and Integrations) Privileges (as oposed to Package privileges) */
  grantedByFleetPrivileges: boolean;

  /**
   * Set when `grantedByFleetPrivileges` is `false` and `granted` is true, which indicate access was granted
   * via a Package Privileges. Array will hold the list of Package names that are allowed
   */
  scopeDataToPackages: string[] | undefined;
}

/**
 * Calculates Authz information for a Route, including:
 * 1. Is access granted
 * 2. was access granted based on Fleet and/or Integration privileges, and
 * 3. a list of package names for which access was granted (only set if access was granted by package privileges)
 *
 * @param fleetAuthz
 * @param requiredAuthz
 */
export const calculateRouteAuthz = (
  fleetAuthz: FleetAuthz,
  requiredAuthz: FleetRouteRequiredAuthz | undefined
): RouteAuthz => {
  const response: RouteAuthz = {
    granted: false,
    grantedByFleetPrivileges: false,
    scopeDataToPackages: undefined,
  };
  const fleetAuthzFlatten = flatten(fleetAuthz);

  const isPrivilegeGranted = (flattenPrivilegeKey: string): boolean =>
    fleetAuthzFlatten[flattenPrivilegeKey] === true;

  if (typeof requiredAuthz === 'undefined') {
    return response;
  }

  if (requiredAuthz.all) {
    response.granted = Object.keys(flatten(requiredAuthz.all)).every(isPrivilegeGranted);

    if (response.granted) {
      if (requiredAuthz.all.fleet || requiredAuthz.all.integrations) {
        response.grantedByFleetPrivileges = true;
      }

      return response;
    }
  }

  if (requiredAuthz.any) {
    response.granted = Object.keys(flatten(requiredAuthz.any)).some(isPrivilegeGranted);

    if (response.granted) {
      // Figure out if authz was granted via Fleet privileges
      if (requiredAuthz.any.fleet || requiredAuthz.any.integrations) {
        const fleetAnyPrivileges = pick(requiredAuthz.any, ['fleet', 'integrations']);

        response.grantedByFleetPrivileges = Object.keys(flatten(fleetAnyPrivileges)).some(
          isPrivilegeGranted
        );
      }

      // If access was NOT granted via Fleet Authz, then retrieve a list of Package names that were
      // granted access to their respective data.
      if (!response.grantedByFleetPrivileges && requiredAuthz.any.packagePrivileges) {
        for (const [packageName, packageRequiredAuthz] of Object.entries(
          requiredAuthz.any.packagePrivileges
        )) {
          const packageRequiredAuthzKeys = Object.keys(
            flatten({ packagePrivileges: { [packageName]: packageRequiredAuthz } })
          );

          if (packageRequiredAuthzKeys.some(isPrivilegeGranted)) {
            if (!response.scopeDataToPackages) {
              response.scopeDataToPackages = [];
            }

            response.scopeDataToPackages.push(packageName);
          }
        }
      }

      return response;
    }
  }

  return response;
};

/**
 * Utility to flatten an object's key all the way down to the last value.
 * @param source
 */
function flatten(source: FleetAuthzRequirements | FleetAuthz): Record<string, boolean> {
  const response: Record<string, boolean> = {};
  const processKeys = (prefix: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      const objectKeys = Object.keys(value);

      for (const key of objectKeys) {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, (value as Record<string, boolean>)[key]);
      }
    } else if (Array.isArray(value)) {
      value.forEach((subValue, key) => {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, subValue);
      });
    } else {
      response[prefix] = value as boolean;
    }
  };

  processKeys('', source);

  return response;
}

/**
 * Utility to determine if a user has the required Fleet Authz based on user privileges
 * and route required authz structure.
 * @param authz
 * @param fleetRequiredAuthz
 * @returns boolean
 */
export const doesNotHaveRequiredFleetAuthz = (
  authz: FleetAuthz,
  fleetRequiredAuthz: FleetAuthzRouteConfig['fleetAuthz']
): boolean => {
  return (
    !!fleetRequiredAuthz &&
    ((typeof fleetRequiredAuthz === 'function' && !fleetRequiredAuthz(authz)) ||
      (typeof fleetRequiredAuthz !== 'function' &&
        !calculateRouteAuthz(authz, { all: fleetRequiredAuthz }).granted))
  );
};
