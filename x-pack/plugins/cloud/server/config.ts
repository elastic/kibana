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

const configSchema = schema.object({
  apm: schema.maybe(apmConfigSchema),
  base_url: schema.maybe(schema.string()),
  cname: schema.maybe(schema.string()),
  deployment_url: schema.maybe(schema.string()),
  id: schema.maybe(schema.string()),
  organization_url: schema.maybe(schema.string()),
  profile_url: schema.maybe(schema.string()),
  trial_end_date: schema.maybe(schema.string()),
  is_elastic_staff_owned: schema.maybe(schema.boolean()),
});

export type CloudConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudConfigType> = {
  exposeToBrowser: {
    base_url: true,
    cname: true,
    deployment_url: true,
    id: true,
    organization_url: true,
    profile_url: true,
    trial_end_date: true,
    is_elastic_staff_owned: true,
  },
  schema: configSchema,
};
