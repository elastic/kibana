/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AsDuration, AsPercent, TimeUnitChar, TimeFormatter } from './utils/formatters';

export {
  formatDurationFromTimeUnitChar,
  asPercent,
  getDurationFormatter,
  asDuration,
} from './utils/formatters';
export { getInspectResponse } from './utils/get_inspect_response';
export { getAlertDetailsUrl, getAlertUrl } from './utils/alerting/alert_url';

export { ProcessorEvent } from './processor_event';

export {
  enableInspectEsQueries,
  maxSuggestions,
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceInventoryOptimizedSorting,
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmLabsButton,
  enableInfrastructureHostsView,
  enableAwsLambdaMetrics,
  enableAgentExplorerView,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
  apmEnableServiceMetrics,
  apmEnableContinuousRollups,
  enableCriticalPath,
  syntheticsThrottlingEnabled,
} from './ui_settings_keys';

export {
  ProgressiveLoadingQuality,
  getProbabilityFromProgressiveLoadingQuality,
} from './progressive_loading';

export const sloFeatureId = 'slo';
export const casesFeatureId = 'observabilityCases';

// The ID of the observability app. Should more appropriately be called
// 'observability' but it's used in telemetry by applicationUsage so we don't
// want to change it.
export const observabilityAppId = 'observability-overview';

// Used by feature and "solution" registration
export const observabilityFeatureId = 'observability';

export {
  NETWORK_TIMINGS_FIELDS,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_TOTAL_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
} from './field_names/synthetics';

export { CoPilotPromptId, coPilotPrompts } from './co_pilot';
