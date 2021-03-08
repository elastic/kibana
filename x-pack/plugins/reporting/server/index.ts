/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { ReportingPlugin } from './plugin';
import { ReportingConfigType } from './config';

export const plugin = (initContext: PluginInitializerContext<ReportingConfigType>) =>
  new ReportingPlugin(initContext);

export { ReportingPlugin as Plugin };
export { config } from './config';
export { ReportingSetupDeps as PluginSetup } from './types';
export { ReportingStartDeps as PluginStart } from './types';

// internal imports
export { ReportingCore } from './core';
export { ReportingConfig } from './config/config';
