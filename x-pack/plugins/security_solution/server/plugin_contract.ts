/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { UsageCollectionSetup as UsageCollectionPluginSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '@kbn/alerting-plugin/server';
import type { CasesStart } from '@kbn/cases-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FleetStartContract as FleetPluginStart } from '@kbn/fleet-plugin/server';
import type { LicensingPluginStart, LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ListPluginSetup } from '@kbn/lists-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type {
  RuleRegistryPluginSetupContract as RuleRegistryPluginSetup,
  RuleRegistryPluginStartContract as RuleRegistryPluginStart,
} from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { OsqueryPluginSetup } from '@kbn/osquery-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import type { PluginSetup as UnifiedSearchServerPluginSetup } from '@kbn/unified-search-plugin/server';
import type { AppFeaturesService } from './lib/app_features_service/app_features_service';
import type { ExperimentalFeatures } from '../common';

export interface SecuritySolutionPluginSetupDependencies {
  alerting: AlertingPluginSetup;
  cloud: CloudSetup;
  data: DataPluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  eventLog: IEventLogService;
  features: FeaturesPluginSetup;
  lists?: ListPluginSetup;
  ml?: MlPluginSetup;
  ruleRegistry: RuleRegistryPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager?: TaskManagerPluginSetup;
  telemetry?: TelemetryPluginSetup;
  usageCollection?: UsageCollectionPluginSetup;
  licensing: LicensingPluginSetup;
  osquery: OsqueryPluginSetup;
  guidedOnboarding?: GuidedOnboardingPluginSetup;
  unifiedSearch: UnifiedSearchServerPluginSetup;
}

export interface SecuritySolutionPluginStartDependencies {
  alerting: AlertingPluginStart;
  cases?: CasesStart;
  cloud: CloudSetup;
  cloudExperiments?: CloudExperimentsPluginStart;
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  eventLog: IEventLogClientService;
  fleet?: FleetPluginStart;
  licensing: LicensingPluginStart;
  ruleRegistry: RuleRegistryPluginStart;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  taskManager?: TaskManagerPluginStart;
  telemetry?: TelemetryPluginStart;
  share: SharePluginStart;
}

export interface SecuritySolutionPluginSetup {
  /**
   * Sets the configurations for app features that are available to the Security Solution
   */
  setAppFeaturesConfigurator: AppFeaturesService['setAppFeaturesConfigurator'];
  /**
   * The security solution generic experimental features
   */
  experimentalFeatures: ExperimentalFeatures;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionPluginStart {}

export type SecuritySolutionPluginCoreSetupDependencies = CoreSetup<
  SecuritySolutionPluginStartDependencies,
  SecuritySolutionPluginStart
>;

export type SecuritySolutionPluginCoreStartDependencies = CoreStart;

export type ISecuritySolutionPlugin = Plugin<
  SecuritySolutionPluginSetup,
  SecuritySolutionPluginStart,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStartDependencies
>;

export type {
  PluginInitializerContext,
  // Legacy type identifiers left for compatibility with the rest of the code:
  SecuritySolutionPluginSetupDependencies as SetupPlugins,
  SecuritySolutionPluginStartDependencies as StartPlugins,
  SecuritySolutionPluginSetup as PluginSetup,
  SecuritySolutionPluginStart as PluginStart,
};
