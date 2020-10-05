/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createGetCertsRoute } from './certs/certs';
import { createGetOverviewFilters } from './overview_filters';
import {
  createGetPingHistogramRoute,
  createGetPingsRoute,
  createJourneyRoute,
  createJourneyScreenshotRoute,
} from './pings';
import { createGetDynamicSettingsRoute, createPostDynamicSettingsRoute } from './dynamic_settings';
import { createLogPageViewRoute } from './telemetry';
import { createGetSnapshotCount } from './snapshot';
import { UMRestApiRouteFactory } from './types';
import {
  createGetMonitorDetailsRoute,
  createMonitorListRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
} from './monitors';
import { createGetMonitorDurationRoute } from './monitors/monitors_durations';
import { createGetIndexPatternRoute, createGetIndexStatusRoute } from './index_state';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';

export const restApiRoutes: UMRestApiRouteFactory[] = [
  createGetCertsRoute,
  createGetOverviewFilters,
  createGetPingsRoute,
  createGetIndexPatternRoute,
  createGetIndexStatusRoute,
  createGetDynamicSettingsRoute,
  createPostDynamicSettingsRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createMonitorListRoute,
  createGetStatusBarRoute,
  createGetSnapshotCount,
  createLogPageViewRoute,
  createGetPingHistogramRoute,
  createGetMonitorDurationRoute,
  createJourneyRoute,
  createJourneyScreenshotRoute,
];
