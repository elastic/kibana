/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core/server';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-server';
import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';

export interface DatasetQualityPluginSetupDependencies {
  fleet: FleetSetupContract;
  analytics: AnalyticsServiceSetup;
  telemetry: TelemetryPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface DatasetQualityPluginStartDependencies {
  fleet: FleetStartContract;
  telemetry: TelemetryPluginStart;
  analytics: AnalyticsServiceStart;
  taskManager: TaskManagerStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginStart {}

export type DatasetQualityRequestHandlerContext = CustomRequestHandlerContext<{}>;
