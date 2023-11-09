/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginConfigDescriptor } from '@kbn/core/server';

import { schema, offeringBasedSchema, type TypeOf } from '@kbn/config-schema';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),

  // Setting only allowed in the Serverless offering
  serverless: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.literal(true),
      options: { defaultValue: schema.contextRef('serverless') },
    }),
  }),
});

export type CloudSecurityPostureConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudSecurityPostureConfig> = {
  schema: configSchema,
};
