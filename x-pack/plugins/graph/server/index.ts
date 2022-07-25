/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from '@kbn/core/server';

import { configSchema, ConfigSchema } from '../config';
import { GraphPlugin } from './plugin';

export const plugin = () => new GraphPlugin();

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    canEditDrillDownUrls: true,
    savePolicy: true,
  },
  schema: configSchema,
};
