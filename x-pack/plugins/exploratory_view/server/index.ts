/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ExploratoryViewPlugin, ExploratoryViewPluginSetup } from './plugin';
import { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';

const configSchema = schema.object({
  annotations: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: 'observability-annotations' }),
  }),
});

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    unsafe: true,
  },
  schema: configSchema,
};

export type ObservabilityConfig = TypeOf<typeof configSchema>;

export const plugin = (initContext: PluginInitializerContext) =>
  new ExploratoryViewPlugin(initContext);

export type { ExploratoryViewPluginSetup as ObservabilityPluginSetup, ScopedAnnotationsClient };
