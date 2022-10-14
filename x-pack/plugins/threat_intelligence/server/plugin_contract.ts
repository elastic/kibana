/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { DataPluginSetup, DataPluginStart } from '@kbn/data-plugin/server/plugin';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export interface ThreatIntelligencePluginSetupDependencies {
  data: DataPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface ThreatIntelligencePluginStartDependencies {
  data: DataPluginStart;
  taskManager: TaskManagerStartContract;
}

export type ThreatIntelligencePluginCoreSetupDependencies = CoreSetup<
  ThreatIntelligencePluginStartDependencies,
  {}
>;

export type ThreatIntelligencePluginCoreStartDependencies = CoreStart;

export type IThreatIntelligencePlugin = Plugin<
  {},
  {},
  ThreatIntelligencePluginSetupDependencies,
  ThreatIntelligencePluginStartDependencies
>;
