/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const apmConfigSchema = schema.object({
  url: schema.maybe(schema.string()),
  secret_token: schema.maybe(schema.string()),
  ui: schema.maybe(
    schema.object({
      url: schema.maybe(schema.string()),
    })
  ),
});

const fullStoryConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  org_id: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string())
  ),
  eventTypesAllowlist: schema.arrayOf(schema.string(), {
    defaultValue: ['Loaded Kibana'],
  }),
});

const chatConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  chatURL: schema.maybe(schema.string()),
});

const configSchema = schema.object({
  apm: schema.maybe(apmConfigSchema),
  base_url: schema.maybe(schema.string()),
  chat: chatConfigSchema,
  chatIdentitySecret: schema.maybe(schema.string()),
  cname: schema.maybe(schema.string()),
  deployment_url: schema.maybe(schema.string()),
  full_story: fullStoryConfigSchema,
  id: schema.maybe(schema.string()),
  organization_url: schema.maybe(schema.string()),
  profile_url: schema.maybe(schema.string()),
  /**
   * How often do we cache the ESS information to avoid performing extra requests.
   */
  cache_ttl: schema.duration({ defaultValue: '1h' }),
  /**
   * Optional settings from Cloud to let Kibana fetch information from their Public APIs.
   * Documentation on the API is https://www.elastic.co/guide/en/cloud/current/ec-restful-api.html
   */
  ess_api: schema.maybe(
    schema.object({
      host: schema.string({ defaultValue: 'https://api.elastic-cloud.com' }),
      auth: schema.object({
        api_key: schema.string(),
      }),
    })
  ),
});

export type CloudConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudConfigType> = {
  exposeToBrowser: {
    base_url: true,
    chat: true,
    cname: true,
    deployment_url: true,
    full_story: true,
    id: true,
    organization_url: true,
    profile_url: true,
  },
  schema: configSchema,
};
