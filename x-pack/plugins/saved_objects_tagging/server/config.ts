/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const configSchema = schema.object({
  cache_refresh_interval: schema.duration({ defaultValue: '15m' }),
});

export type SavedObjectsTaggingConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<SavedObjectsTaggingConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    cache_refresh_interval: true,
  },
};
