/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { CloudCollaborationPlugin } from './plugin';

export { config } from './config';

export function plugin(initializerContext: PluginInitializerContext) {
  return new CloudCollaborationPlugin(initializerContext);
}

export type { CloudCollaborationPluginSetup, CloudCollaborationPluginStart } from './types';
