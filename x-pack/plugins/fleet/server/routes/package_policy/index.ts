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
  PackagePolicyPackageSchema,
  PackagePolicyResponseSchema,
  PackagePolicyStatusResponseSchema,
  DryRunPackagePolicySchema,
} from '../../types';
import { calculateRouteAuthz } from '../../services/security/security';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';

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
              body: () =>
                schema.object({
                  items: schema.arrayOf(PackagePolicyResponseSchema),
                  total: schema.number(),
                  page: schema.number(),
                  perPage: schema.number(),
                }),
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
              body: () =>
                schema.object({
                  items: schema.arrayOf(PackagePolicyResponseSchema),
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
        validate: {},
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
              body: () =>
                schema.object({
                  item: PackagePolicyResponseSchema,
                }),
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
                  success: schema.boolean(),
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
              body: () =>
                schema.arrayOf(
                  PackagePolicyStatusResponseSchema.extends({
                    policy_id: schema.nullable(
                      schema.maybe(
                        schema.string({
                          meta: {
                            description: 'Use `policy_ids` instead',
                            deprecated: true,
                          },
                        })
                      )
                    ),
                    policy_ids: schema.arrayOf(schema.string()),
                    output_id: schema.nullable(schema.maybe(schema.string())),
                    package: PackagePolicyPackageSchema,
                  })
                ),
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
              body: () =>
                schema.object({
                  id: schema.string(),
                }),
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
              body: () => PackagePolicyStatusResponseSchema,
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
              body: () =>
                schema.arrayOf(
                  schema.object({
                    name: schema.maybe(schema.string()),
                    statusCode: schema.maybe(schema.number()),
                    body: schema.maybe(schema.object({ message: schema.string() })),
                    hasErrors: schema.boolean(),
                    diff: schema.maybe(
                      schema.arrayOf(
                        schema.oneOf([
                          PackagePolicyResponseSchema.extends({
                            id: schema.maybe(schema.string()),
                          }),
                          DryRunPackagePolicySchema,
                        ])
                      )
                    ),
                    agent_diff: schema.maybe(
                      schema.arrayOf(
                        schema.arrayOf(
                          schema
                            .object({
                              id: schema.string(),
                              name: schema.string(),
                              revision: schema.number(),
                              type: schema.string(),
                              data_stream: schema.object({
                                namespace: schema.string(),
                              }),
                              use_output: schema.string(),
                              package_policy_id: schema.string(),
                              meta: schema.maybe(
                                schema.object({
                                  package: schema
                                    .object({
                                      name: schema.string(),
                                      version: schema.string(),
                                    })
                                    .extendsDeep({
                                      // equivalent of allowing extra keys like `[key: string]: any;`
                                      unknowns: 'allow',
                                    }),
                                })
                              ),
                              streams: schema.maybe(
                                schema.arrayOf(
                                  schema
                                    .object({
                                      id: schema.string(),
                                      data_stream: schema.object({
                                        dataset: schema.string(),
                                        type: schema.string(),
                                      }),
                                    })
                                    .extendsDeep({
                                      unknowns: 'allow',
                                    })
                                )
                              ),
                              processors: schema.maybe(
                                schema.arrayOf(
                                  schema.object({
                                    add_fields: schema.object({
                                      target: schema.string(),
                                      fields: schema.recordOf(
                                        schema.string(),
                                        schema.oneOf([schema.string(), schema.number()])
                                      ),
                                    }),
                                  })
                                )
                              ),
                            })
                            .extendsDeep({
                              unknowns: 'allow',
                            })
                        )
                      )
                    ),
                  })
                ),
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
