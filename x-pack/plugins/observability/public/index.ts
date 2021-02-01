/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginInitializer } from 'kibana/public';
import { Plugin, ObservabilityPluginSetup, ObservabilityPluginStart } from './plugin';
export type { ObservabilityPluginSetup, ObservabilityPluginStart };

export const plugin: PluginInitializer<ObservabilityPluginSetup, ObservabilityPluginStart> = (
  context: PluginInitializerContext
) => {
  return new Plugin(context);
};

export * from './components/shared/action_menu/';

export type { UXMetrics } from './components/shared/core_web_vitals/';
export { getCoreVitalsComponent, HeaderMenuPortal } from './components/shared/';

export {
  useTrackPageview,
  useUiTracker,
  UiTracker,
  TrackMetricOptions,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';

export * from './typings';

export { useChartTheme } from './hooks/use_chart_theme';
export { useTheme } from './hooks/use_theme';
