/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';

import { IndexMgmtServerPlugin } from './plugin';
import { configSchema } from './config';

export const plugin = (ctx: PluginInitializerContext) => new IndexMgmtServerPlugin(ctx);

export const config = {
  schema: configSchema,
};

/** @public */
export { Dependencies } from './types';
export { IndexManagementPluginSetup } from './plugin';
export { Index, LegacyTemplateSerialized } from '../common';
export { IndexManagementConfig } from './config';
