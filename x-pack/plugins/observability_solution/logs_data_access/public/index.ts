/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from '@kbn/core/public';
import {
  LogsDataAccessPlugin,
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
} from './plugin';

export type { LogsDataAccessPluginSetup, LogsDataAccessPluginStart };

import { LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps } from './types';

export const plugin: PluginInitializer<
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
  LogsDataAccessPluginSetupDeps,
  LogsDataAccessPluginStartDeps
> = () => {
  return new LogsDataAccessPlugin();
};
