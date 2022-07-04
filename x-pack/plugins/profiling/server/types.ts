/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetup, PluginStart } from '@kbn/data-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';

export interface ProfilingPluginSetupDeps {
  data: PluginSetup;
  observability: ObservabilityPluginSetup;
}

export interface ProfilingPluginStartDeps {
  data: PluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}
