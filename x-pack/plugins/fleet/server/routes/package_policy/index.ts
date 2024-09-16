/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

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
  PackagePolicyResponseSchema,
  BulkGetPackagePoliciesResponseBodySchema,
  DeletePackagePoliciesResponseBodySchema,
  DeleteOnePackagePolicyResponseSchema,
  UpgradePackagePoliciesResponseBodySchema,
  DryRunPackagePoliciesResponseBodySchema,
  OrphanedPackagePoliciesResponseSchema,
} from '../../types';
import { calculateRouteAuthz } from '../../services/security/security';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';

import { ListResponseSchema } from '../schema/utils';

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
      description: 'List package policies',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetPackagePoliciesRequestSchema,
          response: {
            200: {
              body: () => ListResponseSchema(PackagePolicyResponseSchema),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: 'Bulk get package policies',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkGetPackagePoliciesRequestSchema,
          response: {
            200: {
              body: () => BulkGetPackagePoliciesResponseBodySchema,
            },
            400: {
              body: genericErrorResponse,
            },
            404: {
              body: notFoundResponse,
            },
          },
        },
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
      description: 'Get package policy by ID',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOnePackagePolicyRequestSchema,
          response: {
            200: {
              body: () =>
                schema.object({
                  item: PackagePolicyResponseSchema,
                }),
            },
            400: {
              body: genericErrorResponse,
            },
            404: {
              body: notFoundResponse,
            },
          },
        },
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
        validate: {
          request: {},
          response: {
            200: {
              body: () =>
                schema.object({
                  items: schema.arrayOf(PackagePolicyResponseSchema),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOrphanedPackagePolicies
    );

  // Create
  // Authz check moved to service here: https://github.com/elastic/kibana/pull/140458
  router.versioned
    .post({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      description: 'Create package policy',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreatePackagePolicyRequestSchema,
          response: {
            200: {
              body: () => OrphanedPackagePoliciesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
            409: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: 'Update package policy by ID',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdatePackagePolicyRequestSchema,
          response: {
            200: {
              body: () =>
                schema.object({
                  item: PackagePolicyResponseSchema,
                }),
            },
            400: {
              body: genericErrorResponse,
            },
            403: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: 'Bulk delete package policies',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeletePackagePoliciesRequestSchema,
          response: {
            200: {
              body: () => DeletePackagePoliciesResponseBodySchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deletePackagePolicyHandler
    );

  router.versioned
    .delete({
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
      description: 'Delete package policy by ID',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteOnePackagePolicyRequestSchema,
          response: {
            200: {
              body: () => DeleteOnePackagePolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: 'Upgrade package policy to a newer package version',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpgradePackagePoliciesRequestSchema,
          response: {
            200: {
              body: () => UpgradePackagePoliciesResponseBodySchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: 'Dry run package policy upgrade',
      options: {
        tags: ['oas-tag:Fleet package policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DryRunPackagePoliciesRequestSchema,
          response: {
            200: {
              body: () => DryRunPackagePoliciesResponseBodySchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      dryRunUpgradePackagePolicyHandler
    );
};
