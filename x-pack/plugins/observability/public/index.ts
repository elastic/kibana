/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import {
  Plugin,
  ObservabilityPublicPluginsStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicStart,
  ObservabilityPublicSetup,
} from './plugin/plugin';
export type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart,
};
export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export {
  enableInspectEsQueries,
  enableComparisonByDefault,
  apmServiceGroupMaxNumberOfServices,
  enableInfrastructureHostsView,
  enableAgentExplorerView,
} from '../common/ui_settings_keys';
export { uptimeOverviewLocatorID } from '../common';

export type { UXMetrics } from './components/shared/core_web_vitals';
export {
  getCoreVitalsComponent,
  HeaderMenuPortal,
  FieldValueSuggestions,
  FieldValueSelection,
  FilterValueLabel,
  SelectableUrlList,
  ExploratoryView,
  DatePicker,
  LoadWhenInView,
  ObservabilityAlertSearchBar,
} from './components/shared';

export type { LazyObservabilityPageTemplateProps } from './components/shared';

export const LazyAlertsFlyout = lazy(() => import('./components/alerts_flyout'));

import { TopAlert } from './typings/alerts';
import type { AlertSummaryField } from './routes/pages/alert_details/components/alert_summary';
import {
  ApmFetchDataResponse,
  APMHasDataResponse,
  Coordinates,
  FetchData,
  FetchDataParams,
  FetchDataResponse,
  HasDataParams,
  HasDataResponse,
  InfraLogsHasDataResponse,
  InfraMetricsHasDataResponse,
  LogsFetchDataResponse,
  MetricsFetchDataResponse,
  MetricsFetchDataSeries,
  ObservabilityFetchDataResponse,
  ObservabilityHasDataResponse,
  Series,
  Stat,
  SyntheticsHasDataResponse,
  UptimeFetchDataResponse,
  UXHasDataResponse,
  UxFetchDataResponse,
} from './routes/pages/overview/helpers/data_handler';
export type {
  AlertSummaryField,
  ApmFetchDataResponse,
  APMHasDataResponse,
  Coordinates,
  FetchData,
  FetchDataParams,
  FetchDataResponse,
  HasDataParams,
  HasDataResponse,
  InfraLogsHasDataResponse,
  InfraMetricsHasDataResponse,
  LogsFetchDataResponse,
  MetricsFetchDataResponse,
  MetricsFetchDataSeries,
  ObservabilityFetchDataResponse,
  ObservabilityHasDataResponse,
  Series,
  Stat,
  SyntheticsHasDataResponse,
  TopAlert,
  UptimeFetchDataResponse,
  UXHasDataResponse,
  UxFetchDataResponse,
};

export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';
export { useEsSearch, createEsParams } from './hooks/use_es_search';
export { useChartTheme } from './hooks/use_chart_theme';
export { useBreadcrumbs } from './hooks/use_breadcrumbs';
export { useTheme } from './hooks/use_theme';
export { useTimeZone } from './hooks/use_time_zone';
export { useTimeBuckets } from './hooks/use_time_buckets';
export { createUseRulesLink } from './hooks/create_use_rules_link';
export { useLinkProps, shouldHandleLinkEvent } from './hooks/use_link_props';
export type { LinkDescriptor } from './hooks/use_link_props';
export type { UiTracker, TrackMetricOptions } from './hooks/use_track_metric';
export {
  useTrackPageview,
  useUiTracker,
  useTrackMetric,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export {
  ReportTypes,
  FILTER_RECORDS,
  ENVIRONMENT_ALL,
  REPORT_METRIC_FIELD,
  USE_BREAK_DOWN_COLUMN,
  RECORDS_FIELD,
  OPERATION_COLUMN,
  TERMS_COLUMN,
  RECORDS_PERCENTAGE_FIELD,
} from './components/shared/exploratory_view/configurations/constants';
export { ExploratoryViewContextProvider } from './components/shared/exploratory_view/contexts/exploratory_view_config';
export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
export { ALL_VALUES_SELECTED } from './components/shared/exploratory_view/configurations/constants/url_constants';
export type { AllSeries } from './components/shared/exploratory_view/hooks/use_series_storage';
export type { SeriesUrl, UrlFilter } from './components/shared/exploratory_view/types';
export type { ExploratoryEmbeddableProps } from './components/shared/exploratory_view/embeddable/embeddable';
export type { SeriesConfig, ConfigProps } from './components/shared/exploratory_view/types';

export {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSpacer,
  SectionSubtitle,
  SectionTitle,
} from './components/shared/action_menu';
export type { SectionLinkProps } from './components/shared/action_menu';

export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './plugin/rule_registry/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './plugin/rule_registry/create_observability_rule_type_registry';

export type { AddInspectorRequest } from './context/inspector/inspector_context';
export { InspectorContextProvider } from './context/inspector/inspector_context';
export { useInspectorContext } from './context/inspector/use_inspector_context';
export { DatePickerContextProvider } from './context/date_picker_context';

export { NavigationWarningPromptProvider, Prompt } from './utils/navigation_warning_prompt';
export { getApmTraceUrl } from './utils/get_apm_trace_url';
export { fromQuery, toQuery } from './utils/url';
export { getAlertSummaryTimeRange } from './utils/alert_summary_widget';
export { convertTo } from '../common/utils/formatters/duration';
export { calculateTimeRangeBucketSize } from './routes/pages/overview/helpers/calculate_bucket_size';
export { formatAlertEvaluationValue } from './utils/format_alert_evaluation_value';
export type { NavigationSection } from './plugin/navigation_registry/navigation_registry';
