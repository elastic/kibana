/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { LogsSharedPlugin } from './plugin';
import { LogsSharedConfig } from './types';

export function plugin(initializerContext: PluginInitializerContext<LogsSharedConfig>) {
  return new LogsSharedPlugin(initializerContext);
}

export type { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
