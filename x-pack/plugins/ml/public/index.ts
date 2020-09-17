/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer, PluginInitializerContext } from 'kibana/public';
import {
  MlPlugin,
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies,
} from './plugin';

export const plugin: PluginInitializer<
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies
> = (initializerContext: PluginInitializerContext) => new MlPlugin(initializerContext);

export type { MlPluginSetup, MlPluginStart };
export type {
  AnomaliesTableRecord,
  DataRecognizerConfigResponse,
  Influencer,
  JobExistResult,
  JobStat,
  MlCapabilitiesResponse,
  MlSummaryJob,
} from './shared';
export { ANOMALY_SEVERITY, getSeverityColor, getSeverityType } from './shared';
