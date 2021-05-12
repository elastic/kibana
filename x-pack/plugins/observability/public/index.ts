/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginInitializer } from 'kibana/public';
import {
  Plugin,
  ObservabilityPublicPluginsStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicStart,
  ObservabilityPublicSetup,
} from './plugin';
export type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart,
};
export { enableInspectEsQueries } from '../common/ui_settings_keys';

export interface ConfigSchema {
  unsafe: { alertingExperience: { enabled: boolean } };
}

export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (context: PluginInitializerContext<ConfigSchema>) => {
  return new Plugin(context);
};

export * from './components/shared/action_menu/';

export type { UXMetrics } from './components/shared/core_web_vitals/';
export {
  getCoreVitalsComponent,
  HeaderMenuPortal,
  FieldValueSuggestions,
} from './components/shared/';

export {
  useTrackPageview,
  useUiTracker,
  useTrackMetric,
  UiTracker,
  TrackMetricOptions,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';

export * from './typings';

export { useChartTheme } from './hooks/use_chart_theme';
export { useTheme } from './hooks/use_theme';
export { getApmTraceUrl } from './utils/get_apm_trace_url';
export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/utils';
export type { SeriesUrl } from './components/shared/exploratory_view/types';

export { FormatterRuleRegistry } from './rules/formatter_rule_registry';
