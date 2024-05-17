/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetDynamicSettingsRoute, createPostDynamicSettingsRoute } from './dynamic_settings';
import { createGetIndexStatusRoute } from './index_state';
import {
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
  createMonitorListRoute,
} from './monitors';
import { createGetMonitorDurationRoute } from './monitors/monitors_durations';
import { createNetworkEventsRoute } from './network_events';
import {
  createGetPingHistogramRoute,
  createGetPingsRoute,
  createJourneyRoute,
  createJourneyScreenshotBlocksRoute,
  createJourneyScreenshotRoute,
} from './pings';
import { createJourneyFailedStepsRoute } from './pings/journeys';
import { createGetSnapshotCount } from './snapshot';
import { createLastSuccessfulCheckRoute } from './synthetics/last_successful_check';
import { UMRestApiRouteFactory } from './types';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';

export const legacyUptimeRestApiRoutes: UMRestApiRouteFactory[] = [
  createGetPingsRoute,
  createGetIndexStatusRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createMonitorListRoute,
  createGetStatusBarRoute,
  createGetSnapshotCount,
  createGetPingHistogramRoute,
  createGetMonitorDurationRoute,
  createJourneyRoute,
  createJourneyScreenshotRoute,
  createNetworkEventsRoute,
  createJourneyFailedStepsRoute,
  createLastSuccessfulCheckRoute,
  createJourneyScreenshotBlocksRoute,
];

export const legacyUptimePublicRestApiRoutes: UMRestApiRouteFactory[] = [
  createGetDynamicSettingsRoute,
  createPostDynamicSettingsRoute,
];
