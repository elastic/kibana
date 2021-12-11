/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { config, InfraConfig, InfraServerPlugin, InfraPluginSetup } from './plugin';

export type { InfraConfig, InfraPluginSetup };
export { config };
export type { InfraRequestHandlerContext } from './types';

export function plugin(context: PluginInitializerContext) {
  return new InfraServerPlugin(context);
}
