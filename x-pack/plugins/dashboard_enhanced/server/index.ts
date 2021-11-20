/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'src/core/server';
import { DashboardEnhancedPlugin } from './plugin';

export type {
  SetupContract as DashboardEnhancedSetupContract,
  SetupDependencies as DashboardEnhancedSetupDependencies,
  StartContract as DashboardEnhancedStartContract,
  StartDependencies as DashboardEnhancedStartDependencies,
} from './plugin';

export function plugin(context: PluginInitializerContext) {
  return new DashboardEnhancedPlugin(context);
}
