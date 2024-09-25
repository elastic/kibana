/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isDiffPathProtocol } from '../../../common/services';

export const GetSettingsRequestSchema = {};

export const PutSettingsRequestSchema = {
  body: schema.object({
    fleet_server_hosts: schema.maybe(
      schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
        validate: (value) => {
          if (value.length && isDiffPathProtocol(value)) {
            return 'Protocol and path must be the same for each URL';
          }
        },
      })
    ),
    has_seen_add_data_notice: schema.maybe(schema.boolean()),
    additional_yaml_config: schema.maybe(schema.string()),
    // Deprecated not used
    kibana_urls: schema.maybe(
      schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
        validate: (value) => {
          if (isDiffPathProtocol(value)) {
            return 'Protocol and path must be the same for each URL';
          }
        },
      })
    ),
    kibana_ca_sha256: schema.maybe(schema.string()),
    prerelease_integrations_enabled: schema.maybe(schema.boolean()),
  }),
};

export const GetSpaceSettingsRequestSchema = {};

export const SpaceSettingsResponseSchema = schema.object({
  item: schema.object({
    managed_by: schema.maybe(schema.string()),
    allowed_namespace_prefixes: schema.arrayOf(schema.string()),
  }),
});

export const SettingsResponseSchema = schema.object({
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
      schema.oneOf([schema.literal('pending'), schema.literal('success'), schema.literal('error')])
    ),
    use_space_awareness_migration_started_at: schema.maybe(schema.string()),
  }),
});

export const PutSpaceSettingsRequestSchema = {
  body: schema.object({
    allowed_namespace_prefixes: schema.maybe(
      schema.arrayOf(
        schema.string({
          validate: (v) => {
            if (v.includes('-')) {
              return 'Must not contain -';
            }
          },
        })
      )
    ),
  }),
};

export const GetEnrollmentSettingsRequestSchema = {
  query: schema.maybe(
    schema.object({
      agentPolicyId: schema.maybe(schema.string()),
    })
  ),
};

export const GetEnrollmentSettingsResponseSchema = schema.object({
  fleet_server: schema.object({
    policies: schema.arrayOf(
      schema.object({
        id: schema.string(),
        name: schema.string(),
        is_managed: schema.boolean(),
        is_default_fleet_server: schema.maybe(schema.boolean()),
        has_fleet_server: schema.maybe(schema.boolean()),
        fleet_server_host_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
        download_source_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
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
        proxy_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
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
        certificate: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
        certificate_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
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
      proxy_id: schema.maybe(
        schema.oneOf([
          schema.literal(null),
          schema.string({
            meta: {
              description:
                'The ID of the proxy to use for this download source. See the proxies API for more information.',
            },
          }),
        ])
      ),
    })
  ),
});
