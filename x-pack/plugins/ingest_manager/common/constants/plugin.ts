/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { DEFAULT_REGISTRY_URL } from '../';

export const PLUGIN_ID = 'ingestManager';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    epm: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      registryUrl: schema.maybe(schema.uri({ defaultValue: DEFAULT_REGISTRY_URL })),
    }),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      defaultOutputHost: schema.string({ defaultValue: 'http://localhost:9200' }),
    }),
  }),
};
