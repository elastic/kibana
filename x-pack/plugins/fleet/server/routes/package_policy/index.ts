/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRouteRequiredAuthz } from '../../services/security';

import type { FleetAuthzRouter } from '../../services/security';

import type { FleetAuthz } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
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
import { calculateRouteAuthz } from '../../services/security/security';

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
  router.versioned
    .get({
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', PACKAGE_POLICY_API_ROUTES.LIST_PATTERN)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetPackagePoliciesRequestSchema },
      },
      getPackagePoliciesHandler
    );

  // Get bulk
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('post', PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: BulkGetPackagePoliciesRequestSchema },
      },
      bulkGetPackagePoliciesHandler
    );

  // Get one
  router.versioned
    .get({
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', PACKAGE_POLICY_API_ROUTES.INFO_PATTERN)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOnePackagePolicyRequestSchema },
      },
      getOnePackagePolicyHandler
    );

  router.versioned
    .get({
      path: PACKAGE_POLICY_API_ROUTES.ORPHANED_INTEGRATION_POLICIES,
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },
      getOrphanedPackagePolicies
    );

  // Create
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: CreatePackagePolicyRequestSchema },
      },
      createPackagePolicyHandler
    );

  // Update
  router.versioned
    .put({
      path: PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('put', PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: UpdatePackagePolicyRequestSchema },
      },

      updatePackagePolicyHandler
    );

  // Delete (bulk)
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeletePackagePoliciesRequestSchema },
      },
      deletePackagePolicyHandler
    );

  router.versioned
    .delete({
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteOnePackagePolicyRequestSchema },
      },
      deleteOnePackagePolicyHandler
    );

  // Upgrade
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.UPGRADE_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: UpgradePackagePoliciesRequestSchema },
      },
      upgradePackagePolicyHandler
    );

  // Upgrade - DryRun
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.DRYRUN_PATTERN,
      fleetAuthz: {
        integrations: { readIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DryRunPackagePoliciesRequestSchema },
      },
      dryRunUpgradePackagePolicyHandler
    );
};
