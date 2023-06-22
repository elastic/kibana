/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deletePackagePolicyRoute } from './monitor_cruds/delete_integration';
import { createJourneyScreenshotRoute } from './pings/journey_screenshots';
import { createJourneyScreenshotBlocksRoute } from './pings/journey_screenshot_blocks';
import { createLastSuccessfulCheckRoute } from './pings/last_successful_check';
import { createJourneyFailedStepsRoute, createJourneyRoute } from './pings/journeys';
import { updateDefaultAlertingRoute } from './default_alerts/update_default_alert';
import { syncParamsSyntheticsParamsRoute } from './settings/sync_global_params';
import { editSyntheticsParamsRoute } from './settings/edit_param';
import { getSyntheticsParamsRoute } from './settings/params';
import { getIndexSizesRoute } from './settings/settings';
import { getAPIKeySyntheticsRoute } from './monitor_cruds/get_api_key';
import { getServiceLocationsRoute } from './synthetics_service/get_service_locations';
import { deleteSyntheticsMonitorRoute } from './monitor_cruds/delete_monitor';
import {
  disableSyntheticsRoute,
  getSyntheticsEnablementRoute,
} from './synthetics_service/enablement';
import {
  getAllSyntheticsMonitorRoute,
  getSyntheticsMonitorOverviewRoute,
  getSyntheticsMonitorRoute,
} from './monitor_cruds/get_monitor';
import { deleteSyntheticsMonitorProjectRoute } from './monitor_cruds/delete_monitor_project';
import { getSyntheticsProjectMonitorsRoute } from './monitor_cruds/get_monitor_project';
import { runOnceSyntheticsMonitorRoute } from './synthetics_service/run_once_monitor';
import { getServiceAllowedRoute } from './synthetics_service/get_service_allowed';
import { testNowMonitorRoute } from './synthetics_service/test_now_monitor';
import { installIndexTemplatesRoute } from './synthetics_service/install_index_templates';
import { editSyntheticsMonitorRoute } from './monitor_cruds/edit_monitor';
import { addSyntheticsMonitorRoute } from './monitor_cruds/add_monitor';
import { addSyntheticsProjectMonitorRoute } from './monitor_cruds/add_monitor_project';
import { addSyntheticsProjectMonitorRouteLegacy } from './monitor_cruds/add_monitor_project_legacy';
import { syntheticsGetPingsRoute, syntheticsGetPingStatusesRoute } from './pings';
import { createGetCurrentStatusRoute } from './overview_status/overview_status';
import {
  SyntheticsRestApiRouteFactory,
  SyntheticsStreamingRouteFactory,
} from '../legacy_uptime/routes';
import { getHasIntegrationMonitorsRoute } from './fleet/get_has_integration_monitors';
import { addSyntheticsParamsRoute } from './settings/add_param';
import { enableDefaultAlertingRoute } from './default_alerts/enable_default_alert';
import { getDefaultAlertingRoute } from './default_alerts/get_default_alert';
import { createNetworkEventsRoute } from './network_events';
import { addPrivateLocationRoute } from './settings/private_locations/add_private_location';
import { deletePrivateLocationRoute } from './settings/private_locations/delete_private_location';
import { getPrivateLocationsRoute } from './settings/private_locations/get_private_locations';

export const syntheticsAppRestApiRoutes: SyntheticsRestApiRouteFactory[] = [
  addSyntheticsMonitorRoute,
  addSyntheticsProjectMonitorRoute,
  getSyntheticsEnablementRoute,
  deleteSyntheticsMonitorRoute,
  deleteSyntheticsMonitorProjectRoute,
  disableSyntheticsRoute,
  editSyntheticsMonitorRoute,
  getServiceLocationsRoute,
  getSyntheticsMonitorRoute,
  getSyntheticsProjectMonitorsRoute,
  getAllSyntheticsMonitorRoute,
  getSyntheticsMonitorOverviewRoute,
  installIndexTemplatesRoute,
  runOnceSyntheticsMonitorRoute,
  testNowMonitorRoute,
  getServiceAllowedRoute,
  getAPIKeySyntheticsRoute,
  syntheticsGetPingsRoute,
  syntheticsGetPingStatusesRoute,
  getHasIntegrationMonitorsRoute,
  createGetCurrentStatusRoute,
  getIndexSizesRoute,
  getSyntheticsParamsRoute,
  editSyntheticsParamsRoute,
  addSyntheticsParamsRoute,
  syncParamsSyntheticsParamsRoute,
  enableDefaultAlertingRoute,
  getDefaultAlertingRoute,
  updateDefaultAlertingRoute,
  createJourneyRoute,
  createLastSuccessfulCheckRoute,
  createJourneyScreenshotBlocksRoute,
  createJourneyFailedStepsRoute,
  createNetworkEventsRoute,
  createJourneyScreenshotRoute,
  deletePackagePolicyRoute,
  addPrivateLocationRoute,
  deletePrivateLocationRoute,
  getPrivateLocationsRoute,
];

export const syntheticsAppStreamingApiRoutes: SyntheticsStreamingRouteFactory[] = [
  addSyntheticsProjectMonitorRouteLegacy,
];
