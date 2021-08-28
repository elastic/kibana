/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type {
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies,
} from './plugin';
import { MlPlugin } from './plugin';

// Be careful adding exports to this file, it may increase the bundle size of
// the ML plugin's page load bundle. You should either just export types or
// use `getMlSharedImports()` to export static code.
export const plugin: PluginInitializer<
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies
> = (initializerContext: PluginInitializerContext) => new MlPlugin(initializerContext);

export { ANOMALY_SEVERITY } from '../common';
export { ES_CLIENT_TOTAL_HITS_RELATION } from '../common/types/es_client';
// Static exports
export {
  getFormattedSeverityScore,
  getSeverity,
  getSeverityColor,
  getSeverityType,
} from '../common/util/anomaly_utils';
export type { AnomalySwimlaneEmbeddableInput } from './embeddables';
export { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from './embeddables/constants';
export { MlLocator, MlLocatorDefinition, ML_PAGES, useMlHref } from './locator';
export type {
  AnomaliesTableRecord,
  DataRecognizerConfigResponse,
  EsSorting,
  Influencer,
  JobExistResult,
  JobStat,
  MlCapabilitiesResponse,
  MlSummaryJob,
  RenderCellValue,
  UseIndexDataReturnType,
} from './shared';
export { CONTROLLED_BY_SWIM_LANE_FILTER } from './ui_actions/constants';
export type { MlPluginSetup, MlPluginStart };

// Bundled shared exports
// Exported this way so the code doesn't end up in ML's page load bundle
export const getMlSharedImports = async () => {
  return await import('./shared');
};
// Helper to get Type returned by getMlSharedImports.
type AwaitReturnType<T> = T extends PromiseLike<infer U> ? U : T;
export type GetMlSharedImportsReturnType = AwaitReturnType<ReturnType<typeof getMlSharedImports>>;
