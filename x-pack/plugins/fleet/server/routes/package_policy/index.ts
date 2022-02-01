/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_API_ROUTES } from '../../constants';
import {
  GetPackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  UpgradePackagePoliciesRequestSchema,
  DryRunPackagePoliciesRequestSchema,
} from '../../types';
import type { FleetAuthzRouter } from '../security';

import {
  getPackagePoliciesHandler,
  getOnePackagePolicyHandler,
  createPackagePolicyHandler,
  updatePackagePolicyHandler,
  deletePackagePolicyHandler,
  upgradePackagePolicyHandler,
  dryRunUpgradePackagePolicyHandler,
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetPackagePoliciesRequestSchema,
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    },
    getPackagePoliciesHandler
  );

  // Get one
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOnePackagePolicyRequestSchema,
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    },
    getOnePackagePolicyHandler
  );

  // Create
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreatePackagePolicyRequestSchema,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    },
    createPackagePolicyHandler
  );

  // Update
  router.put(
    {
      path: PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdatePackagePolicyRequestSchema,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    },
    updatePackagePolicyHandler
  );

  // Delete
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackagePoliciesRequestSchema,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    },
    deletePackagePolicyHandler
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
