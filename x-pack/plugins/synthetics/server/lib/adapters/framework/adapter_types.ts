/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  SavedObjectsClientContract,
  IScopedClusterClient,
  Logger,
  IBasePath,
} from '@kbn/core/server';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { PluginSetupContract } from '@kbn/features-plugin/server';
import { MlPluginSetup as MlSetup } from '@kbn/ml-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { UptimeESClient } from '../../lib';
import type { TelemetryEventsSender } from '../../telemetry/sender';
import type { UptimeRouter } from '../../../types';
import { UMKibanaRoute } from '../../../rest_api';
import { UptimeConfig } from '../../../../common/config';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';

export type UMElasticsearchQueryFn<P, R = any> = (
  params: {
    uptimeEsClient: UptimeESClient;
    esClient?: IScopedClusterClient;
  } & P
) => Promise<R>;

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract,
  params?: P
) => Promise<T> | T;

export interface UptimeServerSetup {
  router: UptimeRouter;
  config: UptimeConfig;
  cloud?: CloudSetup;
  fleet: FleetStartContract;
  security: SecurityPluginStart;
  savedObjectsClient?: SavedObjectsClientContract;
  authSavedObjectsClient?: SavedObjectsClientContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  syntheticsService: SyntheticsService;
  kibanaVersion: string;
  logger: Logger;
  telemetry: TelemetryEventsSender;
  uptimeEsClient: UptimeESClient;
  basePath: IBasePath;
  isDev?: boolean;
}

export interface UptimeCorePluginsSetup {
  features: PluginSetupContract;
  alerting: any;
  observability: ObservabilityPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlSetup;
  cloud?: CloudSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  telemetry: TelemetryPluginSetup;
}

export interface UptimeCorePluginsStart {
  security: SecurityPluginStart;
  fleet: FleetStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  telemetry: TelemetryPluginStart;
}

export interface UMBackendFrameworkAdapter {
  registerRoute(route: UMKibanaRoute): void;
}
