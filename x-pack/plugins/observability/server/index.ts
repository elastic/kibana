/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { ObservabilityPlugin, ObservabilityPluginSetup } from './plugin';
import { createOrUpdateIndex, MappingsDefinition } from './utils/create_or_update_index';
import { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    annotations: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      index: schema.string({ defaultValue: 'observability-annotations' }),
    }),
  }),
};

export type ObservabilityConfig = TypeOf<typeof config.schema>;

export const plugin = (initContext: PluginInitializerContext) =>
  new ObservabilityPlugin(initContext);

export {
  createOrUpdateIndex,
  MappingsDefinition,
  ObservabilityPluginSetup,
  ScopedAnnotationsClient,
};
