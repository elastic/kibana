/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { SETTINGS_API_ROUTES } from '../../constants';
import {
  PutSettingsRequestSchema,
  GetSettingsRequestSchema,
  GetEnrollmentSettingsRequestSchema,
  GetSpaceSettingsRequestSchema,
  PutSpaceSettingsRequestSchema,
} from '../../types';
import type { FleetConfigType } from '../../config';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';

import { getEnrollmentSettingsHandler } from './enrollment_settings_handler';

import {
  getSettingsHandler,
  getSpaceSettingsHandler,
  putSettingsHandler,
  putSpaceSettingsHandler,
} from './settings_handler';

const spaceSettingsResponse = () =>
  schema.object({
    item: schema.object({
      managed_by: schema.maybe(schema.string()),
      allowed_namespace_prefixes: schema.arrayOf(schema.string()),
    }),
  });

const settingsResponse = () =>
  schema.object({
    item: schema.object({
      has_seen_add_data_notice: schema.maybe(schema.boolean()),
      fleet_server_hosts: schema.maybe(schema.arrayOf(schema.string())),
      prerelease_integrations_enabled: schema.boolean(),
      id: schema.string(),
      version: schema.maybe(schema.string()),
      preconfigured_fields: schema.maybe(schema.arrayOf(schema.literal('fleet_server_hosts'))),
      secret_storage_requirements_met: schema.maybe(schema.boolean()),
      output_secret_storage_requirements_met: schema.maybe(schema.boolean()),
      use_space_awareness_migration_status: schema.maybe(
        schema.oneOf([
          schema.literal('pending'),
          schema.literal('success'),
          schema.literal('error'),
        ])
      ),
      use_space_awareness_migration_started_at: schema.maybe(schema.string()),
    }),
  });

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);
  if (experimentalFeatures.useSpaceAwareness) {
    router.versioned
      .get({
        path: SETTINGS_API_ROUTES.SPACE_INFO_PATTERN,
        fleetAuthz: (authz) => {
          return (
            authz.fleet.readSettings ||
            authz.integrations.writeIntegrationPolicies ||
            authz.fleet.allAgentPolicies
          );
        },
        description: `Get space settings`,
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: GetSpaceSettingsRequestSchema,
            response: {
              200: {
                body: spaceSettingsResponse,
              },
            },
          },
        },
        getSpaceSettingsHandler
      );

    router.versioned
      .put({
        path: SETTINGS_API_ROUTES.SPACE_UPDATE_PATTERN,
        fleetAuthz: {
          fleet: { allSettings: true },
        },
        description: `Put space settings`,
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: PutSpaceSettingsRequestSchema,
            response: {
              200: {
                body: spaceSettingsResponse,
              },
            },
          },
        },
        putSpaceSettingsHandler
      );
  }

  router.versioned
    .get({
      path: SETTINGS_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      description: `Get settings`,
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetSettingsRequestSchema,
          response: {
            200: {
              body: settingsResponse,
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
      getSettingsHandler
    );
  router.versioned
    .put({
      path: SETTINGS_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      description: `Update settings`,
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PutSettingsRequestSchema,
          response: {
            200: {
              body: settingsResponse,
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
      putSettingsHandler
    );
  router.versioned
    .get({
      path: SETTINGS_API_ROUTES.ENROLLMENT_INFO_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.addAgents || authz.fleet.addFleetServers;
      },
      description: `Get enrollment settings`,
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetEnrollmentSettingsRequestSchema,
          response: {
            200: {
              body: () =>
                schema.object({
                  fleet_server: schema.object({
                    policies: schema.arrayOf(
                      schema.object({
                        id: schema.string(),
                        name: schema.string(),
                        is_managed: schema.boolean(),
                        is_default_fleet_server: schema.maybe(schema.boolean()),
                        has_fleet_server: schema.maybe(schema.boolean()),
                        fleet_server_host_id: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                        download_source_id: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                        space_ids: schema.maybe(schema.arrayOf(schema.string())),
                      })
                    ),
                    has_active: schema.boolean(),
                    host: schema.maybe(
                      schema.object({
                        id: schema.string(),
                        name: schema.string(),
                        host_urls: schema.arrayOf(schema.string()),
                        is_default: schema.boolean(),
                        is_preconfigured: schema.boolean(),
                        is_internal: schema.maybe(schema.boolean()),
                        proxy_id: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                      })
                    ),
                    host_proxy: schema.maybe(
                      schema.object({
                        id: schema.string(),
                        proxy_headers: schema.maybe(
                          schema.recordOf(
                            schema.string(),
                            schema.oneOf([schema.string(), schema.number(), schema.boolean()])
                          )
                        ),
                        name: schema.string(),
                        url: schema.string(),
                        certificate_authorities: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                        certificate: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                        certificate_key: schema.maybe(
                          schema.oneOf([schema.literal(null), schema.string()])
                        ),
                        is_preconfigured: schema.boolean(),
                      })
                    ),
                  }),
                  download_source: schema.maybe(
                    schema.object({
                      id: schema.string(),
                      name: schema.string(),
                      host: schema.string(),
                      is_default: schema.boolean(),
                      proxy_id: schema.nullable(
                        schema.maybe(
                          schema.string({
                            meta: {
                              description:
                                'The ID of the proxy to use for this download source. See the proxies API for more information.',
                            },
                          })
                        )
                      ),
                    })
                  ),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getEnrollmentSettingsHandler
    );
};
