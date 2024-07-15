/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
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
  deployments_url: schema.string({ defaultValue: '/deployments' }),
  deployment_url: schema.maybe(schema.string()),
  id: schema.maybe(schema.string()),
  billing_url: schema.maybe(schema.string()),
  performance_url: schema.maybe(schema.string()),
  users_and_roles_url: schema.maybe(schema.string()),
  organization_url: schema.maybe(schema.string()),
  profile_url: schema.maybe(schema.string()),
  projects_url: offeringBasedSchema({ serverless: schema.string({ defaultValue: '/projects/' }) }),
  trial_end_date: schema.maybe(schema.string()),
  is_elastic_staff_owned: schema.maybe(schema.boolean()),
  onboarding: schema.maybe(
    schema.object({
      default_solution: schema.maybe(schema.string()),
    })
  ),
  serverless: schema.maybe(
    schema.object(
      {
        project_id: schema.maybe(schema.string()),
        project_name: schema.maybe(schema.string()),
        project_type: schema.maybe(schema.string()),
      },
      // avoid future chicken-and-egg situation with the component populating the config
      { unknowns: 'ignore' }
    )
  ),
});

export type CloudConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudConfigType> = {
  exposeToBrowser: {
    base_url: true,
    cname: true,
    deployments_url: true,
    deployment_url: true,
    id: true,
    billing_url: true,
    users_and_roles_url: true,
    performance_url: true,
    organization_url: true,
    profile_url: true,
    projects_url: true,
    trial_end_date: true,
    is_elastic_staff_owned: true,
    serverless: {
      project_id: true,
      project_name: true,
      project_type: true,
    },
    onboarding: {
      default_solution: true,
    },
  },
  schema: configSchema,
};
