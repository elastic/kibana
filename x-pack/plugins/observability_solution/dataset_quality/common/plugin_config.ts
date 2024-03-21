/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  estimatedDataEnabled: offeringBasedSchema({
    traditional: schema.boolean({ defaultValue: true }),
    serverless: schema.boolean({ defaultValue: false }),
  }),
});

export const publicConfigKeys = {
  estimatedDataEnabled: true,
} as const;

export type DatasetQualityConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<DatasetQualityConfig> = {
  schema: configSchema,
  exposeToBrowser: publicConfigKeys,
};
