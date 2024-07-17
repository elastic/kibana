/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SharePluginSetup } from '@kbn/share-plugin/server';
import { Observable } from 'rxjs';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';

import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { HomeServerPluginSetup, HomeServerPluginStart } from '@kbn/home-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ActionsPlugin } from '@kbn/actions-plugin/server';
import { AlertingPlugin } from '@kbn/alerting-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '@kbn/fleet-plugin/server';
import { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';

import {
  CustomIntegrationsPluginSetup,
  CustomIntegrationsPluginStart,
} from '@kbn/custom-integrations-plugin/server';
import {
  ProfilingDataAccessPluginSetup,
  ProfilingDataAccessPluginStart,
} from '@kbn/profiling-data-access-plugin/server';
import {
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
} from '@kbn/logs-data-access-plugin/server';
import type {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
} from '@kbn/observability-ai-assistant-plugin/server';
import { APMConfig } from '.';

export interface APMPluginSetup {
  config$: Observable<APMConfig>;
}

export interface APMPluginSetupDependencies {
  // required dependencies
  apmDataAccess: ApmDataAccessPluginSetup;
  data: DataPluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  observability: ObservabilityPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  metricsDataAccess: MetricsDataPluginSetup;
  dataViews: {};
  share: SharePluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantServerSetup;
  // optional dependencies
  actions?: ActionsPlugin['setup'];
  alerting?: AlertingPlugin['setup'];
  cloud?: CloudSetup;
  fleet?: FleetPluginSetup;
  home?: HomeServerPluginSetup;
  ml?: MlPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
  profilingDataAccess?: ProfilingDataAccessPluginSetup;
  logsDataAccess: LogsDataAccessPluginSetup;
}
export interface APMPluginStartDependencies {
  // required dependencies
  apmDataAccess: ApmDataAccessPluginStart;
  data: DataPluginStart;
  features: FeaturesPluginStart;
  licensing: LicensingPluginStart;
  observability: undefined;
  ruleRegistry: RuleRegistryPluginStartContract;
  metricsDataAccess: MetricsDataPluginSetup;
  dataViews: DataViewsServerPluginStart;
  share: undefined;
  observabilityAIAssistant?: ObservabilityAIAssistantServerStart;
  // optional dependencies
  actions?: ActionsPlugin['start'];
  alerting?: AlertingPlugin['start'];
  cloud?: undefined;
  fleet?: FleetPluginStart;
  home?: HomeServerPluginStart;
  ml?: MlPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  taskManager?: TaskManagerStartContract;
  usageCollection?: undefined;
  customIntegrations?: CustomIntegrationsPluginStart;
  profilingDataAccess?: ProfilingDataAccessPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
}
