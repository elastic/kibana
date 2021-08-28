/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type {
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from './plugin';
import { Plugin } from './plugin';

export { enableInspectEsQueries } from '../common/ui_settings_keys';
export type { LazyObservabilityPageTemplateProps } from './components/shared';
export {
  FieldValueSuggestions,
  getCoreVitalsComponent,
  HeaderMenuPortal,
} from './components/shared/';
export * from './components/shared/action_menu/';
export type { UXMetrics } from './components/shared/core_web_vitals/';
export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/utils';
export type { SeriesUrl } from './components/shared/exploratory_view/types';
export { ALL_VALUES_SELECTED } from './components/shared/field_value_suggestions/field_value_combobox';
export { FilterValueLabel } from './components/shared/filter_value_label/filter_value_label';
export { useBreadcrumbs } from './hooks/use_breadcrumbs';
export { useChartTheme } from './hooks/use_chart_theme';
export { FETCH_STATUS, useFetcher } from './hooks/use_fetcher';
export { useTheme } from './hooks/use_theme';
export {
  METRIC_TYPE,
  TrackMetricOptions,
  UiTracker,
  useTrackMetric,
  useTrackPageview,
  useUiTracker,
} from './hooks/use_track_metric';
export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './rules/observability_rule_type_registry_mock';
export * from './typings';
export { getApmTraceUrl } from './utils/get_apm_trace_url';
export type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart,
};

export interface ConfigSchema {
  unsafe: { alertingExperience: { enabled: boolean }; cases: { enabled: boolean } };
}

export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (context: PluginInitializerContext<ConfigSchema>) => {
  return new Plugin(context);
};

export const LazyAlertsFlyout = lazy(() => import('./pages/alerts/alerts_flyout'));
