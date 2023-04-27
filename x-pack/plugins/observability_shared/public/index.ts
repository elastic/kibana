/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilitySharedPlugin } from './plugin';
export type {
  ObservabilitySharedPlugin,
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from './plugin';

export type {
  ObservabilityPageTemplateProps,
  LazyObservabilityPageTemplateProps,
} from './components/page_template/page_template';

export type { NavigationEntry } from './components/page_template/page_template';
export { HeaderMenuPortal } from './components/header_menu';

export { useObservabilityTourContext } from './components/tour';

export const plugin = () => {
  return new ObservabilitySharedPlugin();
};

export {
  observabilityFeatureId,
  observabilityAppId,
  casesFeatureId,
  sloFeatureId,
} from '../common';

export { useTheme } from './hooks/use_theme';
export { useKibanaSpace } from './hooks/use_kibana_space';
export { METRIC_TYPE, useTrackMetric, useUiTracker } from './hooks/use_track_metric';
export { useQuickTimeRanges } from './hooks/use_quick_time_ranges';
export { useGetUserCasesPermissions } from './hooks/use_get_user_cases_permissions';

export type { ApmIndicesConfig, UXMetrics } from './types';
