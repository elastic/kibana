/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  enabled: offeringBasedSchema({
    // cloud_data_migration is disabled in serverless; refer to the serverless.yml file as the source of truth
    // We take this approach in order to have a central place (serverless.yml) to view disabled plugins across Kibana
    serverless: schema.boolean({ defaultValue: true }),
  }),
});

export type CloudDataMigrationConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudDataMigrationConfig> = {
  schema: configSchema,
};
