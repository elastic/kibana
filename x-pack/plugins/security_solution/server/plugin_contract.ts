/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { UsageCollectionSetup as UsageCollectionPluginSetup } from '@kbn/usage-collection-plugin/server';
import {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '@kbn/alerting-plugin/server';
import { PluginStartContract as CasesPluginStart } from '@kbn/cases-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { FleetStartContract as FleetPluginStart } from '@kbn/fleet-plugin/server';
import { LicensingPluginStart, LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { ListPluginSetup } from '@kbn/lists-plugin/server';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import {
  RuleRegistryPluginSetupContract as RuleRegistryPluginSetup,
  RuleRegistryPluginStartContract as RuleRegistryPluginStart,
} from '@kbn/rule-registry-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '@kbn/task-manager-plugin/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';

export interface SecuritySolutionPluginSetupDependencies {
  alerting: AlertingPluginSetup;
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
}

export interface SecuritySolutionPluginStartDependencies {
  alerting: AlertingPluginStart;
  cases?: CasesPluginStart;
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
