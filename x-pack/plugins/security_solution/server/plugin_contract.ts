/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { UsageCollectionSetup as UsageCollectionPluginSetup } from '../../../../src/plugins/usage_collection/server';
import {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '../../alerting/server';
import { PluginStartContract as CasesPluginStart } from '../../cases/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { IEventLogClientService, IEventLogService } from '../../event_log/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { FleetStartContract as FleetPluginStart } from '../../fleet/server';
import { LicensingPluginStart, LicensingPluginSetup } from '../../licensing/server';
import { ListPluginSetup } from '../../lists/server';
import { MlPluginSetup } from '../../ml/server';
import {
  RuleRegistryPluginSetupContract as RuleRegistryPluginSetup,
  RuleRegistryPluginStartContract as RuleRegistryPluginStart,
} from '../../rule_registry/server';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '../../task_manager/server';
import {
  TelemetryPluginStart,
  TelemetryPluginSetup,
} from '../../../../src/plugins/telemetry/server';

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
