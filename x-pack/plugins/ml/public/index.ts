/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Be careful adding exports to this file, it may increase the bundle size of
// the ML plugin's page load bundle. You should either just export types or
// use `getMlSharedImports()` to export static code.

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies,
} from './plugin';
import { MlPlugin } from './plugin';

export const plugin: PluginInitializer<
  MlPluginSetup,
  MlPluginStart,
  MlSetupDependencies,
  MlStartDependencies
> = (initializerContext: PluginInitializerContext) => new MlPlugin(initializerContext);

export type { MlPluginSetup, MlPluginStart };
export type { TrainedModelConfigResponse } from '../common/types/trained_models';

export type { MlCapabilitiesResponse } from '../common/types/capabilities';
export type { MlSummaryJob } from '../common/types/anomaly_detection_jobs';
export type { JobExistResult, JobStat } from '../common/types/data_recognizer';
export type { DataRecognizerConfigResponse } from '../common/types/modules';

export type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './embeddables';

export { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from './embeddables/constants';
export { CONTROLLED_BY_SWIM_LANE_FILTER } from './ui_actions/constants';

export type { MlLocator } from './locator';
export { useMlHref, ML_PAGES, MlLocatorDefinition } from './locator';

// Bundled shared exports
// Exported this way so the code doesn't end up in ML's page load bundle
export const getMlSharedImports = async () => {
  return await import('./shared');
};

// Helper to get Type returned by getMlSharedImports.
type AwaitReturnType<T> = T extends PromiseLike<infer U> ? U : T;
export type GetMlSharedImportsReturnType = AwaitReturnType<ReturnType<typeof getMlSharedImports>>;

export { MLJobsAwaitingNodeWarning } from './application/components/jobs_awaiting_node_warning/new_job_awaiting_node_shared';
export { MlNodeAvailableWarningShared } from './application/components/node_available_warning';
