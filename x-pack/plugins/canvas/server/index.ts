/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { CanvasPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new CanvasPlugin(initializerContext);

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};
