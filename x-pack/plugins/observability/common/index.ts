/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AsDuration, AsPercent, TimeUnitChar } from './utils/formatters';

export { formatDurationFromTimeUnitChar } from './utils/formatters';

export {
  enableInspectEsQueries,
  maxSuggestions,
  enableComparisonByDefault,
  enableInfrastructureView,
  defaultApmServiceEnvironment,
  apmServiceInventoryOptimizedSorting,
} from './ui_settings_keys';

export const casesFeatureId = 'observabilityCases';

// The ID of the observability app. Should more appropriately be called
// 'observability' but it's used in telemetry by applicationUsage so we don't
// want to change it.
export const observabilityAppId = 'observability-overview';

// Used by feature and "solution" registration
export const observabilityFeatureId = 'observability';

// Used by Cases to install routes
export const casesPath = '/cases';

// Name of a locator created by the uptime plugin. Intended for use
// by other plugins as well, so defined here to prevent cross-references.
export const uptimeOverviewLocatorID = 'UPTIME_OVERVIEW_LOCATOR';
