/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

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
});

const driftChatConfigSchema = schema.object({
  chat_url: schema.maybe(schema.string()),
});

const configSchema = schema.object({
  id: schema.maybe(schema.string()),
  apm: schema.maybe(apmConfigSchema),
  cname: schema.maybe(schema.string()),
  base_url: schema.maybe(schema.string()),
  profile_url: schema.maybe(schema.string()),
  deployment_url: schema.maybe(schema.string()),
  organization_url: schema.maybe(schema.string()),
  full_story: fullStoryConfigSchema,
  drift: schema.maybe(driftChatConfigSchema),
});

export type CloudConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudConfigType> = {
  exposeToBrowser: {
    id: true,
    cname: true,
    base_url: true,
    profile_url: true,
    deployment_url: true,
    organization_url: true,
    full_story: true,
    drift: true,
  },
  schema: configSchema,
};
