/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CustomRequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SearchRequestHandlerContext } from '@kbn/data-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { InfraServerPluginStartDeps } from './lib/adapters/framework';
import { InfraSources } from './lib/sources';

export type { InfraConfig } from '../common/plugin_config_types';

export type InfraPluginCoreSetup = CoreSetup<InfraServerPluginStartDeps, MetricsDataPluginStart>;
export type InfraPluginStartServicesAccessor = InfraPluginCoreSetup['getStartServices'];

export interface MetricsDataPluginSetup {
  getClient: () => InfraSources;
}

export interface MetricsDataPluginStart {
  getMetricIndices: (
    savedObjectsClient: SavedObjectsClientContract,
    sourceId?: string
  ) => Promise<string>;
}

export type MlSystem = ReturnType<MlPluginSetup['mlSystemProvider']>;
export type MlAnomalyDetectors = ReturnType<MlPluginSetup['anomalyDetectorsProvider']>;

export interface InfraMlRequestHandlerContext {
  mlAnomalyDetectors?: MlAnomalyDetectors;
  mlSystem?: MlSystem;
}

export interface InfraSpacesRequestHandlerContext {
  spaceId: string;
}

export type InfraRequestHandlerContext = InfraMlRequestHandlerContext &
  InfraSpacesRequestHandlerContext;

/**
 * @internal
 */
export type InfraPluginRequestHandlerContext = CustomRequestHandlerContext<{
  infra: InfraRequestHandlerContext;
  search: SearchRequestHandlerContext;
}>;
