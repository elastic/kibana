/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const configSchema = schema.object({
  search_timeout: schema.duration({ defaultValue: '30s' }),
});

export type GlobalSearchConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<GlobalSearchConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    search_timeout: true,
  },
};
