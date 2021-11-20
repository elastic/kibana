/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  IScopedClusterClient,
} from 'src/core/server';
import { ObservabilityPluginSetup } from '../../../../../observability/server';
import { UMKibanaRoute } from '../../../rest_api';
import { PluginSetupContract } from '../../../../../features/server';
import { MlPluginSetup as MlSetup } from '../../../../../ml/server';
import { RuleRegistryPluginSetupContract } from '../../../../../rule_registry/server';
import { UptimeESClient } from '../../lib';
import type { UptimeRouter } from '../../../types';

export type UMElasticsearchQueryFn<P, R = any> = (
  params: {
    uptimeEsClient: UptimeESClient;
    esClient?: IScopedClusterClient;
  } & P
) => Promise<R>;

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract | ISavedObjectsRepository,
  params?: P
) => Promise<T> | T;

export interface UptimeCoreSetup {
  router: UptimeRouter;
}

export interface UptimeCorePlugins {
  features: PluginSetupContract;
  alerting: any;
  elasticsearch: any;
  observability: ObservabilityPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface UMBackendFrameworkAdapter {
  registerRoute(route: UMKibanaRoute): void;
}
