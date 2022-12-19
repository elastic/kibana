/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import type { ActionsPlugin } from '@kbn/actions-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { Ecs } from '@kbn/ecs';

import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginSetupContract } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '@kbn/task-manager-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { CreateLiveQueryRequestBodySchema } from '../common/schemas/routes/live_query';

export interface OsqueryPluginSetup {
  osqueryCreateAction: (payload: CreateLiveQueryRequestBodySchema, ecsData?: Ecs) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginStart {}

export interface SetupPlugins {
  usageCollection?: UsageCollectionSetup;
  actions: ActionsPlugin['setup'];
  data: DataPluginSetup;
  features: PluginSetupContract;
  security: SecurityPluginStart;
  taskManager?: TaskManagerPluginSetup;
  telemetry?: TelemetryPluginSetup;
}

export interface StartPlugins {
  actions: ActionsPlugin['start'];
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  fleet?: FleetStartContract;
  taskManager?: TaskManagerPluginStart;
  telemetry?: TelemetryPluginStart;
  ruleRegistry?: RuleRegistryPluginStartContract;
}
