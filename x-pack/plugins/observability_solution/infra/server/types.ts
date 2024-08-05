/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CustomRequestHandlerContext,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SearchRequestHandlerContext } from '@kbn/data-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { InfraServerPluginStartDeps } from './lib/adapters/framework';
import { InventoryViewsServiceSetup, InventoryViewsServiceStart } from './services/inventory_views';
import {
  MetricsExplorerViewsServiceSetup,
  MetricsExplorerViewsServiceStart,
} from './services/metrics_explorer_views';

export type { InfraConfig } from '../common/plugin_config_types';

export type InfraPluginCoreSetup = CoreSetup<InfraServerPluginStartDeps, InfraPluginStart>;
export type InfraPluginStartServicesAccessor = InfraPluginCoreSetup['getStartServices'];

export interface InfraPluginSetup {
  inventoryViews: InventoryViewsServiceSetup;
  metricsExplorerViews?: MetricsExplorerViewsServiceSetup;
}

export interface InfraPluginStart {
  inventoryViews: InventoryViewsServiceStart;
  metricsExplorerViews?: MetricsExplorerViewsServiceStart;
}

export type MlSystem = ReturnType<MlPluginSetup['mlSystemProvider']>;
export type MlAnomalyDetectors = ReturnType<MlPluginSetup['anomalyDetectorsProvider']>;

export interface InfraRequestHandlerContext {
  mlAnomalyDetectors?: MlAnomalyDetectors;
  mlSystem?: MlSystem;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  getMetricsIndices: () => Promise<string>;
}

/**
 * @internal
 */
export type InfraPluginRequestHandlerContext = CustomRequestHandlerContext<{
  infra: InfraRequestHandlerContext;
  search: SearchRequestHandlerContext;
}>;
