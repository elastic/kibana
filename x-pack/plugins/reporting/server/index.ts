/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { ReportingConfigType } from './config';
import { ReportingPlugin } from './plugin';

export const plugin = (initContext: PluginInitializerContext<ReportingConfigType>) =>
  new ReportingPlugin(initContext);

export { config } from './config';
export type { ReportingConfig } from './config/config';
// internal imports
export { ReportingCore } from './core';
export type {
  ReportingSetup,
  ReportingSetupDeps as PluginSetup,
  ReportingStartDeps as PluginStart,
} from './types';
export { ReportingPlugin as Plugin };
