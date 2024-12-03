/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { Observable } from 'rxjs';
import type { ActionsPlugin } from '@kbn/actions-plugin/server';
import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '@kbn/fleet-plugin/server';
import type { HomeServerPluginSetup, HomeServerPluginStart } from '@kbn/home-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  CustomIntegrationsPluginSetup,
  CustomIntegrationsPluginStart,
} from '@kbn/custom-integrations-plugin/server';
import type {
  EntityManagerServerPluginSetup,
  EntityManagerServerPluginStart,
} from '@kbn/entityManager-plugin/server';
import type {
  LogsDataAccessPluginSetup,
  LogsDataAccessPluginStart,
} from '@kbn/logs-data-access-plugin/server';
import type {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
} from '@kbn/observability-ai-assistant-plugin/server';
import type {
  ProfilingDataAccessPluginSetup,
  ProfilingDataAccessPluginStart,
} from '@kbn/profiling-data-access-plugin/server';
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
  logsDataAccess: LogsDataAccessPluginSetup;
  entityManager: EntityManagerServerPluginSetup;
  // optional dependencies
  observabilityAIAssistant?: ObservabilityAIAssistantServerSetup;
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
  logsDataAccess: LogsDataAccessPluginStart;
  entityManager: EntityManagerServerPluginStart;
  // optional dependencies
  observabilityAIAssistant?: ObservabilityAIAssistantServerStart;
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
}
