/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';

import { IndexMgmtServerPlugin } from './plugin';
import { configSchema } from './config';

export const plugin = (context: PluginInitializerContext) => new IndexMgmtServerPlugin(context);

export const config: PluginConfigDescriptor = {
  schema: configSchema,
  deprecations: ({ deprecate }) => [deprecate('enabled', '8.0.0')],
};

/** @public */
export { Dependencies } from './types';
export { IndexManagementPluginSetup } from './plugin';
export { Index, LegacyTemplateSerialized } from '../common';
export { IndexManagementConfig } from './config';
