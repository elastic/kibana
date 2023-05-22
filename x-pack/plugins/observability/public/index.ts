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
export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export {
  syntheticsThrottlingEnabled,
  enableInspectEsQueries,
  enableComparisonByDefault,
  apmServiceGroupMaxNumberOfServices,
  enableInfrastructureHostsView,
  enableAgentExplorerView,
} from '../common/ui_settings_keys';
export { uptimeOverviewLocatorID } from '../common';

export type { UXMetrics } from './components/core_web_vitals/core_vitals';
export { getCoreVitalsComponent } from './components/core_web_vitals/get_core_web_vitals_lazy';

export { DatePicker } from './pages/overview/components/date_picker/date_picker';
export { ObservabilityAlertSearchBar } from './components/alert_search_bar/get_alert_search_bar_lazy';

export const LazyAlertsFlyout = lazy(() => import('./components/alerts_flyout/alerts_flyout'));

export * from './typings';
import { TopAlert } from './typings/alerts';
import { AlertSummary } from './pages/alert_details/components/alert_summary';
import { AlertSummaryField } from './pages/alert_details/components/alert_summary';
export type { TopAlert, AlertSummary, AlertSummaryField };

export { observabilityFeatureId, observabilityAppId } from '../common';

export { useTimeBuckets } from './hooks/use_time_buckets';
export { createUseRulesLink } from './hooks/create_use_rules_link';

export { getApmTraceUrl } from './utils/get_apm_trace_url';

export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './rules/observability_rule_type_registry_mock';

export { DatePickerContextProvider } from './context/date_picker_context/date_picker_context';

export { fromQuery, toQuery } from './utils/url';
export { getAlertSummaryTimeRange } from './utils/alert_summary_widget';
export { calculateTimeRangeBucketSize } from './pages/overview/helpers/calculate_bucket_size';

export { convertTo } from '../common/utils/formatters/duration';
export { formatAlertEvaluationValue } from './utils/format_alert_evaluation_value';
