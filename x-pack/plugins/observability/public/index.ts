/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
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
export {
  enableInspectEsQueries,
  enableComparisonByDefault,
  apmServiceGroupMaxNumberOfServices,
  enableInfrastructureHostsView,
  enableAgentExplorerView,
} from '../common/ui_settings_keys';
export { uptimeOverviewLocatorID } from '../common';

export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export * from './components/shared/action_menu';

export type { UXMetrics } from './components/shared/core_web_vitals';
export { DatePickerContextProvider } from './context/date_picker_context';

export {
  getCoreVitalsComponent,
  HeaderMenuPortal,
  FieldValueSuggestions,
  FieldValueSelection,
  FilterValueLabel,
  DatePicker,
  LoadWhenInView,
  ObservabilityAlertSearchBar,
} from './components/shared';

export type { LazyObservabilityPageTemplateProps } from './components/shared';

export type { UiTracker, TrackMetricOptions } from './hooks/use_track_metric';
export {
  useTrackPageview,
  useUiTracker,
  useTrackMetric,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export const LazyAlertsFlyout = lazy(() => import('./components/alerts_flyout'));
export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';
export { useEsSearch, createEsParams } from './hooks/use_es_search';

export * from './typings';
import { TopAlert } from './typings/alerts';
import { AlertSummary } from './pages/alert_details/components/alert_summary';
import { AlertSummaryField } from './pages/alert_details/components/alert_summary';
export type { TopAlert, AlertSummary, AlertSummaryField };

export { observabilityFeatureId, observabilityAppId } from '../common';

export { useChartTheme } from './hooks/use_chart_theme';
export { useBreadcrumbs } from './hooks/use_breadcrumbs';
export { useTheme } from './hooks/use_theme';
export { useTimeZone } from './hooks/use_time_zone';
export { useTimeBuckets } from './hooks/use_time_buckets';
export { createUseRulesLink } from './hooks/create_use_rules_link';
export { useLinkProps, shouldHandleLinkEvent } from './hooks/use_link_props';
export type { LinkDescriptor } from './hooks/use_link_props';

export { NavigationWarningPromptProvider, Prompt } from './utils/navigation_warning_prompt';
export { getApmTraceUrl } from './utils/get_apm_trace_url';

export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './rules/observability_rule_type_registry_mock';

export type { AddInspectorRequest } from './context/inspector/inspector_context';
export { InspectorContextProvider } from './context/inspector/inspector_context';
export { useInspectorContext } from './context/inspector/use_inspector_context';

export { fromQuery, toQuery } from './utils/url';
export { getAlertSummaryTimeRange } from './utils/alert_summary_widget';
export { calculateTimeRangeBucketSize } from './pages/overview/helpers/calculate_bucket_size';

export type { NavigationSection } from './services/navigation_registry';
export { convertTo } from '../common/utils/formatters/duration';
export { formatAlertEvaluationValue } from './utils/format_alert_evaluation_value';
