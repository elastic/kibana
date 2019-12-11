/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { InfraPlugin } from './plugin';

export const config = {
  schema: schema.object({
    enabled: schema.maybe(schema.boolean()),
    query: schema.object({
      partitionSize: schema.maybe(schema.number()),
      partitionFactor: schema.maybe(schema.number()),
    }),
  }),
};

export const plugin = (initContext: PluginInitializerContext) => new InfraPlugin(initContext);

export type InfraConfig = TypeOf<typeof config.schema>;
export { InfraSetup } from './plugin';
