/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext } from '@kbn/core/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import {
  CoreStart,
  IBasePath,
  IRouter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { PluginStartContract as AlertingPluginStart } from '@kbn/alerting-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { BfetchServerSetup } from '@kbn/bfetch-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { MlPluginSetup as MlSetup } from '@kbn/ml-plugin/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TelemetryEventsSender } from './telemetry/sender';
import { UptimeConfig } from './config';
import { SyntheticsEsClient } from './lib';

export interface SyntheticsServerSetup {
  router: UptimeRouter;
  config: UptimeConfig;
  cloud?: CloudSetup;
  spaces?: SpacesPluginStart;
  fleet: FleetStartContract;
  security: SecurityPluginStart;
  savedObjectsClient?: SavedObjectsClientContract;
  authSavedObjectsClient?: SavedObjectsClientContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  share: SharePluginSetup;
  stackVersion: string;
  logger: Logger;
  telemetry: TelemetryEventsSender;
  syntheticsEsClient: SyntheticsEsClient;
  basePath: IBasePath;
  isDev?: boolean;
  coreStart: CoreStart;
  pluginsStart: SyntheticsPluginsStartDependencies;
  isElasticsearchServerless: boolean;
}

export interface SyntheticsPluginsSetupDependencies {
  features: FeaturesPluginSetup;
  alerting: any;
  observability: ObservabilityPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlSetup;
  cloud?: CloudSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
  telemetry: TelemetryPluginSetup;
  bfetch: BfetchServerSetup;
  share: SharePluginSetup;
}

export interface SyntheticsPluginsStartDependencies {
  security: SecurityPluginStart;
  elasticsearch: SecurityPluginStart;
  fleet: FleetStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  telemetry: TelemetryPluginStart;
  spaces?: SpacesPluginStart;
  alerting: AlertingPluginStart;
}

export type UptimeRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type UptimeRouter = IRouter<UptimeRequestHandlerContext>;
