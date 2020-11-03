/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { DashboardEnhancedPlugin } from './plugin';

export {
  SetupContract as DashboardEnhancedSetupContract,
  SetupDependencies as DashboardEnhancedSetupDependencies,
  StartContract as DashboardEnhancedStartContract,
  StartDependencies as DashboardEnhancedStartDependencies,
} from './plugin';

export {
  AbstractDashboardDrilldown as DashboardEnhancedAbstractDashboardDrilldown,
  AbstractDashboardDrilldownConfig as DashboardEnhancedAbstractDashboardDrilldownConfig,
  AbstractDashboardDrilldownParams as DashboardEnhancedAbstractDashboardDrilldownParams,
} from './services/drilldowns/abstract_dashboard_drilldown';

export function plugin(context: PluginInitializerContext) {
  return new DashboardEnhancedPlugin(context);
}
