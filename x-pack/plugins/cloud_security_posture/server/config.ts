/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from 'kibana/server';

const shouldEnablePlugin = process.env.CI_GROUP ? true : false;

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: shouldEnablePlugin }),
});
type CloudSecurityPostureConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudSecurityPostureConfig> = {
  schema: configSchema,
};
