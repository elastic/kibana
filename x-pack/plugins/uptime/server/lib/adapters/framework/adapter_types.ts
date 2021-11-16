/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type { IScopedClusterClient } from 'src/core/server';
import { ObservabilityPluginSetup } from '../../../../../observability/server';
import { UMKibanaRoute } from '../../../rest_api';
import { PluginSetupContract } from '../../../../../features/server';
import { MlPluginSetup as MlSetup } from '../../../../../ml/server';
import { RuleRegistryPluginSetupContract } from '../../../../../rule_registry/server';
import { SecurityPluginStart } from '../../../../../security/server';
import type { CloudSetup } from '../../../../../cloud/server';
import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '../../../../../task_manager/server';
import {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '../../../../../fleet/server';
import { UptimeESClient } from '../../lib';
import type { UptimeRouter } from '../../../types';
import { UptimeConfig } from '../../../config';

export type UMElasticsearchQueryFn<P, R = any> = (
  params: {
    uptimeEsClient: UptimeESClient;
    esClient?: IScopedClusterClient;
  } & P
) => Promise<R>;

export interface UptimeCoreSetup {
  config: UptimeConfig;
  router: UptimeRouter;
  cloud?: CloudSetup;
  security?: SecurityPluginStart;
  fleet: FleetPluginStart;
}

export interface UptimeCorePluginsSetup {
  features: PluginSetupContract;
  alerting: any;
  elasticsearch: any;
  observability: ObservabilityPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  taskManager: TaskManagerSetupContract;
  cloud?: CloudSetup;
  fleet: FleetPluginSetup;
}

export interface UptimeCorePluginsStart {
  security: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
  fleet: FleetPluginStart;
}

export interface UMBackendFrameworkAdapter {
  registerRoute(route: UMKibanaRoute): void;
}
