/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { DashboardEnhancedPlugin } from './plugin';

export {
  SetupContract as DashboardEnhancedSetupContract,
  SetupDependencies as DashboardEnhancedSetupDependencies,
  StartContract as DashboardEnhancedStartContract,
  StartDependencies as DashboardEnhancedStartDependencies,
} from './plugin';

export function plugin(context: PluginInitializerContext) {
  return new DashboardEnhancedPlugin(context);
}
