/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import type { LogExplorerConfig } from '../common/plugin_config';
import { LogExplorerPlugin } from './plugin';
export type {
  CreateLogExplorerController,
  LogExplorerController,
  LogExplorerCustomizations,
  LogExplorerFlyoutContentProps,
  LogExplorerPublicState,
  LogExplorerPublicStateUpdate,
} from './controller';
export type { LogExplorerControllerContext } from './state_machines/log_explorer_controller';
export type { LogExplorerPluginSetup, LogExplorerPluginStart } from './types';
export {
  getDiscoverColumnsFromDisplayOptions,
  getDiscoverGridFromDisplayOptions,
  getDiscoverFiltersFromState,
} from './utils/convert_discover_app_state';

export { createLogExplorer } from './components/log_explorer';
export { useKibanaContextForPluginProvider } from './utils/use_kibana';

export { DatasetSelector } from './components/dataset_selector';
export { DatasetsProvider, useDatasetsContext } from './hooks/use_datasets';
export { useDatasetSelection } from './hooks/use_dataset_selection';
export { DataViewsProvider, useDataViewsContext } from './hooks/use_data_views';
export { useEsql } from './hooks/use_esql';
export { IntegrationsProvider, useIntegrationsContext } from './hooks/use_integrations';
export type { IDatasetsClient } from './services/datasets';
export { DatasetsService } from './services/datasets';

export function plugin(context: PluginInitializerContext<LogExplorerConfig>) {
  return new LogExplorerPlugin(context);
}
