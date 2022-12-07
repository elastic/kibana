/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

import type { RouteMethod } from '@kbn/core-http-server';

import { AGENT_POLICY_API_ROUTES, PACKAGE_POLICY_API_ROUTES } from '../../../common';

import type { FleetRouteRequiredAuthz } from './types';

/**
 * The authorization requirements needed for an API route. Route authorization requirements are
 * defined either via an `all` object, where all values must be `true` in order for access to be granted,
 * or, by an `any` object, where any value defined that is set to `true` will grant access to the API.
 *
 * The `all` conditions are checked first and if those evaluate to `false`, then `any` conditions are evaluated.
 */
const ROUTE_AUTHZ_REQUIREMENTS = deepFreeze<Record<string, FleetRouteRequiredAuthz>>({
  // Package Policy Update API
  [`put:${PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN}`]: {
    any: {
      integrations: { writeIntegrationPolicies: true },
      packagePrivileges: {
        endpoint: {
          actions: {
            writePolicyManagement: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy GET one API
  [`get:${PACKAGE_POLICY_API_ROUTES.INFO_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy Bulk GET API
  [`post:${PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },

  // Package Policy List API
  [`get:${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },
});

/**
 * Retrieves the required fleet route authz
 * in order to grant access to the given api route
 * replaces the actual policy id with the route path pattern placeholder
 * @param routeMethod
 * @param routePath
 * @param policyIds
 */
export const getRouteRequiredAuthz = (
  routeMethod: RouteMethod,
  routePath: string,
  policyIds?: { packagePolicyId?: string; agentPolicyId?: string }
): FleetRouteRequiredAuthz => {
  let key = `${routeMethod}:${routePath}`;

  if (routePath.includes(PACKAGE_POLICY_API_ROUTES.LIST_PATTERN) && policyIds?.packagePolicyId) {
    key = key.replace(policyIds?.packagePolicyId, '{packagePolicyId}');
  } else if (routePath.includes(AGENT_POLICY_API_ROUTES.LIST_PATTERN) && policyIds?.agentPolicyId) {
    key = key.replace(policyIds?.agentPolicyId, '{agentPolicyId}');
  }

  return ROUTE_AUTHZ_REQUIREMENTS[key];
};
