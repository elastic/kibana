/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Be careful adding exports to this file, it may increase the bundle size of
// the ML plugin's page load bundle. You should either just export types or
// use `getMlSharedImports()` to export static code.

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

// Static exports
export { getSeverityColor, getSeverityType } from '../common/util/anomaly_utils';
export { ANOMALY_SEVERITY } from '../common';
export { useMlHref, ML_PAGES, MlUrlGenerator } from './ml_url_generator';

// Bundled shared exports
// Exported this way so the code doesn't end up in ML's page load bundle
export const getMlSharedImports = async () => {
  return await import('./shared');
};
// Helper to get Type returned by getMlSharedImports.
type AwaitReturnType<T> = T extends PromiseLike<infer U> ? U : T;
export type GetMlSharedImportsReturnType = AwaitReturnType<ReturnType<typeof getMlSharedImports>>;
