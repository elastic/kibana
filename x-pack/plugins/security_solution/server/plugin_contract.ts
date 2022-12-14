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
import type { UsageCollectionSetup as UsageCollectionPluginSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '@kbn/alerting-plugin/server';
import type { PluginStartContract as CasesPluginStart } from '@kbn/cases-plugin/server';
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
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import type { PluginSetup as UnifiedSearchServerPluginSetup } from '@kbn/unified-search-plugin/server';

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
  guidedOnboarding: GuidedOnboardingPluginSetup;
  unifiedSearch: UnifiedSearchServerPluginSetup;
}

export interface SecuritySolutionPluginStartDependencies {
  alerting: AlertingPluginStart;
  cases?: CasesPluginStart;
  cloudExperiments?: CloudExperimentsPluginStart;
  data: DataPluginStart;
  eventLog: IEventLogClientService;
  fleet?: FleetPluginStart;
  licensing: LicensingPluginStart;
  ruleRegistry: RuleRegistryPluginStart;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  taskManager?: TaskManagerPluginStart;
  telemetry?: TelemetryPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionPluginSetup {}

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
