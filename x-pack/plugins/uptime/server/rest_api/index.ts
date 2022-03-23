/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createGetPingHistogramRoute,
  createGetPingsRoute,
  createJourneyRoute,
  createJourneyScreenshotRoute,
  createJourneyScreenshotBlocksRoute,
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
import { createGetIndexStatusRoute } from './index_state';
import { createNetworkEventsRoute } from './network_events';
import { createJourneyFailedStepsRoute } from './pings/journeys';
import { createLastSuccessfulCheckRoute } from './synthetics/last_successful_check';
import { installIndexTemplatesRoute } from './synthetics_service/install_index_templates';
import { getServiceLocationsRoute } from './synthetics_service/get_service_locations';
import {
  getAllSyntheticsMonitorRoute,
  getSyntheticsMonitorRoute,
} from './synthetics_service/get_monitor';
import { addSyntheticsMonitorRoute } from './synthetics_service/add_monitor';
import { editSyntheticsMonitorRoute } from './synthetics_service/edit_monitor';
import { deleteSyntheticsMonitorRoute } from './synthetics_service/delete_monitor';
import { runOnceSyntheticsMonitorRoute } from './synthetics_service/run_once_monitor';
import { testNowMonitorRoute } from './synthetics_service/test_now_monitor';
import {
  getSyntheticsEnablementRoute,
  disableSyntheticsRoute,
  enableSyntheticsRoute,
} from './synthetics_service/enablement';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';

export const restApiRoutes: UMRestApiRouteFactory[] = [
  addSyntheticsMonitorRoute,
  getSyntheticsEnablementRoute,
  createGetPingsRoute,
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
  createNetworkEventsRoute,
  createJourneyFailedStepsRoute,
  createLastSuccessfulCheckRoute,
  createJourneyScreenshotBlocksRoute,
  deleteSyntheticsMonitorRoute,
  disableSyntheticsRoute,
  editSyntheticsMonitorRoute,
  enableSyntheticsRoute,
  getServiceLocationsRoute,
  getSyntheticsMonitorRoute,
  getAllSyntheticsMonitorRoute,
  installIndexTemplatesRoute,
  runOnceSyntheticsMonitorRoute,
  testNowMonitorRoute,
];
