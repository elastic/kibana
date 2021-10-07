/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext, PluginInitializer } from 'kibana/public';
import { lazy } from 'react';
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

export * from './components/shared/action_menu/';

export type { UXMetrics } from './components/shared/core_web_vitals/';
export {
  getCoreVitalsComponent,
  HeaderMenuPortal,
  FieldValueSuggestions,
  FilterValueLabel,
} from './components/shared/';

export type { LazyObservabilityPageTemplateProps } from './components/shared';

export {
  useTrackPageview,
  useUiTracker,
  useTrackMetric,
  UiTracker,
  TrackMetricOptions,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export const LazyAlertsFlyout = lazy(() => import('./pages/alerts/alerts_flyout'));
export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';
export { useEsSearch, createEsParams } from './hooks/use_es_search';

export * from './typings';

export { useChartTheme } from './hooks/use_chart_theme';
export { useBreadcrumbs } from './hooks/use_breadcrumbs';
export { useTheme } from './hooks/use_theme';
export { getApmTraceUrl } from './utils/get_apm_trace_url';
export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/utils';
export { ALL_VALUES_SELECTED } from './components/shared/field_value_suggestions/field_value_combobox';
export type { AllSeries } from './components/shared/exploratory_view/hooks/use_series_storage';
export type { SeriesUrl } from './components/shared/exploratory_view/types';

export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './rules/observability_rule_type_registry_mock';
export type { ExploratoryEmbeddableProps } from './components/shared/exploratory_view/embeddable/embeddable';

export { InspectorContextProvider } from './context/inspector/inspector_context';
export { useInspectorContext } from './context/inspector/use_inspector_context';
