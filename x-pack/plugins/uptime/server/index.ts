/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { UptimePlugin } from './plugin';

export const config = {
  schema: schema.object({
    enabled: schema.maybe(schema.boolean()),
    indexPattern: schema.maybe(schema.string()),
  }),
};

export const plugin = (initContext: PluginInitializerContext) => new UptimePlugin(initContext);

export type UptimeConfig = TypeOf<typeof config.schema>;
export { UptimeSetup } from './plugin';
