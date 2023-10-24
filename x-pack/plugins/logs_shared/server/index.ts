/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { LogsSharedPlugin } from './plugin';

export type { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
export type {
  LogsSharedLogEntriesDomain,
  ILogsSharedLogEntriesDomain,
} from './lib/domains/log_entries_domain';

export { config } from './config';
export { logViewSavedObjectName } from './saved_objects';

export function plugin(context: PluginInitializerContext) {
  return new LogsSharedPlugin(context);
}
