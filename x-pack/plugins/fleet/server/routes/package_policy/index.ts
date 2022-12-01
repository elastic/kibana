/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthz } from '../../../common';
import { PACKAGE_POLICY_API_ROUTES } from '../../constants';
import {
  GetPackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  UpgradePackagePoliciesRequestSchema,
  DryRunPackagePoliciesRequestSchema,
  DeleteOnePackagePolicyRequestSchema,
  BulkGetPackagePoliciesRequestSchema,
} from '../../types';
import {
  type FleetAuthzRouter,
  READ_ENDPOINT_PACKAGE_PRIVILEGES as packagePrivileges,
  validateSecurityRbac,
} from '../security';

import {
  getPackagePoliciesHandler,
  getOnePackagePolicyHandler,
  createPackagePolicyHandler,
  updatePackagePolicyHandler,
  deletePackagePolicyHandler,
  upgradePackagePolicyHandler,
  dryRunUpgradePackagePolicyHandler,
  getOrphanedPackagePolicies,
  deleteOnePackagePolicyHandler,
  bulkGetPackagePoliciesHandler,
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetPackagePoliciesRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: {
              readIntegrationPolicies: true,
            },
            ...packagePrivileges,
          },
        }),
    },
    getPackagePoliciesHandler
  );

  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN,
      validate: BulkGetPackagePoliciesRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: {
              readIntegrationPolicies: true,
            },
            ...packagePrivileges,
          },
        }),
    },
    bulkGetPackagePoliciesHandler
  );

  // Get one
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOnePackagePolicyRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: {
              readIntegrationPolicies: true,
            },
            ...packagePrivileges,
          },
        }),
    },
    getOnePackagePolicyHandler
  );

  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.ORPHANED_INTEGRATION_POLICIES,
      validate: {},
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    },
    getOrphanedPackagePolicies
  );

  // Create
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreatePackagePolicyRequestSchema,
    },
    createPackagePolicyHandler
  );

  // Update
  router.put(
    {
      path: PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdatePackagePolicyRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: { writeIntegrationPolicies: true },
            ...packagePrivileges,
          },
        }),
    },
    updatePackagePolicyHandler
  );

  // Delete
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackagePoliciesRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: { writeIntegrationPolicies: true },
            ...packagePrivileges,
          },
        }),
    },
    deletePackagePolicyHandler
  );

  router.delete(
    {
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      validate: DeleteOnePackagePolicyRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        validateSecurityRbac(fleetAuthz, {
          any: {
            integrations: { writeIntegrationPolicies: true },
            ...packagePrivileges,
          },
        }),
    },
    deleteOnePackagePolicyHandler
  );

  // Upgrade
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.UPGRADE_PATTERN,
      validate: UpgradePackagePoliciesRequestSchema,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    },
    upgradePackagePolicyHandler
  );

  // Upgrade - DryRun
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.DRYRUN_PATTERN,
      validate: DryRunPackagePoliciesRequestSchema,
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    },
    dryRunUpgradePackagePolicyHandler
  );
};
