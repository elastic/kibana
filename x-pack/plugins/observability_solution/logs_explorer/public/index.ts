/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import type { LogsExplorerConfig } from '../common/plugin_config';
import { LogsExplorerPlugin } from './plugin';

export type {
  CreateLogsExplorerController,
  LogsExplorerController,
  LogsExplorerPublicState,
  LogsExplorerPublicStateUpdate,
} from './controller';
export type {
  LogsExplorerCustomizations,
  LogsExplorerCustomizationEvents,
} from './customizations/types';
export type { LogsExplorerControllerContext } from './state_machines/logs_explorer_controller';
export { DEFAULT_ALL_SELECTION } from './state_machines/logs_explorer_controller/src/default_all_selection';
export type { LogsExplorerPluginSetup, LogsExplorerPluginStart } from './types';
export {
  getDiscoverColumnsFromDisplayOptions,
  getDiscoverGridFromDisplayOptions,
  getDiscoverFiltersFromState,
  getDiscoverColumnsWithFallbackFieldsFromDisplayOptions,
} from './utils/convert_discover_app_state';

export function plugin(context: PluginInitializerContext<LogsExplorerConfig>) {
  return new LogsExplorerPlugin(context);
}
