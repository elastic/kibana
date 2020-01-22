/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { IngestManagerPlugin } from './plugin';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
    agentConfig: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    epm: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    agentConfig: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  }),
};

export type IngestManagerConfigType = TypeOf<typeof config.schema>;

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};
