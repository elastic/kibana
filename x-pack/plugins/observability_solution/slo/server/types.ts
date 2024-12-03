/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract, PluginStartContract } from '@kbn/alerting-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SloClient } from './client';

export type { SLOConfig } from '../common/config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SLOServerSetup {}

export interface SLOServerStart {
  getSloClientWithRequest: (request: KibanaRequest) => SloClient;
}

export interface SLOPluginSetupDependencies {
  alerting: PluginSetupContract;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces: SpacesPluginSetup;
  cloud?: CloudSetup;
  usageCollection: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  dataViews: DataViewsServerPluginStart;
}

export interface SLOPluginStartDependencies {
  alerting: PluginStartContract;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dataViews: DataViewsServerPluginStart;
  licensing: LicensingPluginStart;
}
