/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  cache_refresh_interval: schema.duration({ defaultValue: '15m' }),
});

export type SavedObjectsTaggingConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<SavedObjectsTaggingConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    cache_refresh_interval: true,
  },
};
