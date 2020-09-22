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
  UseIndexDataReturnType,
  EsSorting,
  RenderCellValue,
} from './shared';

// static exports
export { getSeverityColor, getSeverityType } from '../common/util/anomaly_utils';
export { ANOMALY_SEVERITY } from '../common';

// bundled shared exports
// exported this way so the code doesn't end up in ML's page load bundle
export const getShared = async () => {
  return await import('./shared');
};
