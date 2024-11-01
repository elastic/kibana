/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertingApiRequestHandlerContext,
  PluginSetupContract,
  PluginStartContract,
} from '@kbn/alerting-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreRequestHandlerContext, CustomRequestHandlerContext } from '@kbn/core/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
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

/**
 * @internal
 */
export type SloRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  core: Promise<CoreRequestHandlerContext>;
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SLOServerSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SLOServerStart {}

export interface SLOPluginSetupDependencies {
  alerting: PluginSetupContract;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
  cloud?: CloudSetup;
  usageCollection: UsageCollectionSetup;
}

export interface SLOPluginStartDependencies {
  alerting: PluginStartContract;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dataViews: DataViewsServerPluginStart;
}

export type { SLOConfig } from '../common/config';
