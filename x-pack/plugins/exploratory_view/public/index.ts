/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import {
  Plugin,
  ExploratoryViewPublicPluginsStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicSetup,
} from './plugin';
export type {
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicPluginsStart,
};
export const plugin: PluginInitializer<
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export { ALL_VALUES_SELECTED } from './components/shared/exploratory_view/configurations/constants/url_constants';

export * from './components/shared/action_menu';

export { APP_ROUTE as EXPLORATORY_VIEW_APP_URL } from './constants';

export type { UXMetrics } from './components/shared/core_web_vitals';

export {
  getCoreVitalsComponent,
  ExploratoryView,
  FieldValueSuggestions,
  FieldValueSelection,
  FilterValueLabel,
  SelectableUrlList,
} from './components/shared';

export * from './typings';

export { NavigationWarningPromptProvider, Prompt } from './utils/navigation_warning_prompt';
export { getApmTraceUrl } from './utils/get_apm_trace_url';
export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
export type { AllSeries } from './components/shared/exploratory_view/hooks/use_series_storage';
export type { SeriesUrl, UrlFilter } from './components/shared/exploratory_view/types';
export type { ExploratoryEmbeddableProps } from './components/shared/exploratory_view/embeddable/embeddable';

export type { AddInspectorRequest } from './context/inspector/inspector_context';
export { InspectorContextProvider } from './context/inspector/inspector_context';
export { useInspectorContext } from './context/inspector/use_inspector_context';

export type { SeriesConfig, ConfigProps } from './components/shared/exploratory_view/types';
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
export { fromQuery, toQuery } from './utils/url';

export type { NavigationSection } from './services/navigation_registry';
export { convertTo } from '../common/utils/formatters/duration';
export { formatAlertEvaluationValue } from './utils/format_alert_evaluation_value';
