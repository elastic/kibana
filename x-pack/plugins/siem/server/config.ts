/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';

const sourceConfigurationSchema = schema.object({
  defaultIndex: schema.arrayOf(schema.string(), { defaultValue: [] }),
  fields: schema.object({
    container: schema.string(),
    host: schema.string(),
    message: schema.arrayOf(schema.string(), { defaultValue: [] }),
    pod: schema.string(),
    tiebreaker: schema.string(),
    timestamp: schema.string(),
  }),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  query: schema.object({
    partitionSize: schema.number({ defaultValue: 75 }),
    partitionFactor: schema.number({ defaultValue: 1.2 }),
  }),
  sources: schema.recordOf(schema.string(), sourceConfigurationSchema, { defaultValue: {} }),
});

export const createConfig$ = (context: PluginInitializerContext) =>
  context.config.create<TypeOf<typeof configSchema>>().pipe(map(config => config));

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer T>
  ? T
  : ReturnType<typeof createConfig$>;
