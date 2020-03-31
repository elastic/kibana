/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createGetOverviewFilters } from './overview_filters';
import { createGetPingsRoute } from './pings';
import { createGetDynamicSettingsRoute, createPostDynamicSettingsRoute } from './dynamic_settings';
import { createLogPageViewRoute } from './telemetry';
import { createGetSnapshotCount } from './snapshot';
import { UMRestApiRouteFactory } from './types';
import {
  createGetMonitorRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
} from './monitors';
import { createGetPingHistogramRoute } from './pings/get_ping_histogram';
import { createGetMonitorDurationRoute } from './monitors/monitors_durations';
import { createGetIndexPatternRoute, createGetIndexStatusRoute } from './index_state';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';

export const restApiRoutes: UMRestApiRouteFactory[] = [
  createGetOverviewFilters,
  createGetPingsRoute,
  createGetIndexPatternRoute,
  createGetIndexStatusRoute,
  createGetDynamicSettingsRoute,
  createPostDynamicSettingsRoute,
  createGetMonitorRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
  createGetSnapshotCount,
  createLogPageViewRoute,
  createGetPingHistogramRoute,
  createGetMonitorDurationRoute,
];
