/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

// -------------------------------
// >= 8.6 UA is always enabled to guide stack upgrades
// even for minors releases.
// -------------------------------
const configSchema = schema.object({
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type UpgradeAssistantConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<UpgradeAssistantConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: configSchema,
  deprecations: () => [],
};
