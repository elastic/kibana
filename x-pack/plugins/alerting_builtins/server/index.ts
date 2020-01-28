/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { AlertingBuiltinsPlugin } from './plugin';
import { configSchema } from './config';

export const plugin = (ctx: PluginInitializerContext) => new AlertingBuiltinsPlugin(ctx);

export const config = {
  schema: configSchema,
};

export const MAX_INTERVALS = 200;
export const MAX_GROUPS = 1000;
export const DEFAULT_GROUPS = 100;

export { IService } from './types';
