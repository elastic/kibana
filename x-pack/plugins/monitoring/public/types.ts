/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, AppMountParameters } from '@kbn/core/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export type { MonitoringConfig } from '../server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export type { MLJobs } from '../server/lib/elasticsearch/get_ml_jobs';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export interface MonitoringStartPluginDependencies {
  navigation: NavigationStart;
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  dataViews: DataViewsPublicPluginStart;
}

interface LegacyStartDependencies {
  element: HTMLElement;
  core: CoreStart;
  isCloud: boolean;
  pluginInitializerContext: PluginInitializerContext;
  externalConfig: Array<Array<string | number> | Array<string | boolean>>;
  appMountParameters: AppMountParameters;
}

export type LegacyMonitoringStartPluginDependencies = MonitoringStartPluginDependencies &
  LegacyStartDependencies;

export type MonitoringStartServices = CoreStart & MonitoringStartPluginDependencies;
