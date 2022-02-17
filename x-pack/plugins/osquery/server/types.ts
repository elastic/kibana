/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryPluginSetup, TelemetryPluginStart } from 'src/plugins/telemetry/server';
import type { ActionsPlugin } from '../../actions/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import type { FleetStartContract } from '../../fleet/server';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import type { PluginSetupContract } from '../../features/server';
import type { SecurityPluginStart } from '../../security/server';
import {
  TaskManagerSetupContract as TaskManagerPluginSetup,
  TaskManagerStartContract as TaskManagerPluginStart,
} from '../../task_manager/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginSetup {}
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
  fleet?: FleetStartContract;
  taskManager?: TaskManagerPluginStart;
  telemetry?: TelemetryPluginStart;
}
