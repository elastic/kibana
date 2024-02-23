/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSyntheticsParamsRoute } from './settings/params/params';
import { editSyntheticsParamsRoute } from './settings/params/edit_param';
import { getConnectorTypesRoute } from './default_alerts/get_connector_types';
import { getActionConnectorsRoute } from './default_alerts/get_action_connectors';
import { SyntheticsRestApiRouteFactory } from './types';
import { getSyntheticsCertsRoute } from './certs/get_certificates';
import { getAgentPoliciesRoute } from './settings/private_locations/get_agent_policies';
import { inspectSyntheticsMonitorRoute } from './monitor_cruds/inspect_monitor';
import { deletePackagePolicyRoute } from './monitor_cruds/delete_integration';
import { createJourneyScreenshotRoute } from './pings/journey_screenshots';
import { createJourneyScreenshotBlocksRoute } from './pings/journey_screenshot_blocks';
import { createLastSuccessfulCheckRoute } from './pings/last_successful_check';
import { createJourneyFailedStepsRoute, createJourneyRoute } from './pings/journeys';
import { updateDefaultAlertingRoute } from './default_alerts/update_default_alert';
import { syncParamsSyntheticsParamsRoute } from './settings/sync_global_params';
import { getIndexSizesRoute } from './settings/settings';
import { getAPIKeySyntheticsRoute } from './monitor_cruds/get_api_key';
import { getServiceLocationsRoute } from './synthetics_service/get_service_locations';
import { deleteSyntheticsMonitorRoute } from './monitor_cruds/delete_monitor';
import {
  disableSyntheticsRoute,
  getSyntheticsEnablementRoute,
} from './synthetics_service/enablement';
import {
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
import { syntheticsGetPingsRoute, syntheticsGetPingStatusesRoute } from './pings';
import { createGetCurrentStatusRoute } from './overview_status/overview_status';
import { getHasIntegrationMonitorsRoute } from './fleet/get_has_integration_monitors';
import { enableDefaultAlertingRoute } from './default_alerts/enable_default_alert';
import { getDefaultAlertingRoute } from './default_alerts/get_default_alert';
import { createNetworkEventsRoute } from './network_events';
import { addPrivateLocationRoute } from './settings/private_locations/add_private_location';
import { deletePrivateLocationRoute } from './settings/private_locations/delete_private_location';
import { getPrivateLocationsRoute } from './settings/private_locations/get_private_locations';
import { getSyntheticsFilters } from './filters/filters';
import { getAllSyntheticsMonitorRoute } from './monitor_cruds/get_monitors_list';
import { getLocationMonitors } from './settings/private_locations/get_location_monitors';
import { addSyntheticsParamsRoute } from './settings/params/add_param';
import { deleteSyntheticsParamsRoute } from './settings/params/delete_param';

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
  getLocationMonitors,
  getSyntheticsFilters,
  inspectSyntheticsMonitorRoute,
  getAgentPoliciesRoute,
  getSyntheticsCertsRoute,
  getActionConnectorsRoute,
  getConnectorTypesRoute,
];

export const syntheticsAppPublicRestApiRoutes: SyntheticsRestApiRouteFactory[] = [
  getSyntheticsParamsRoute,
  editSyntheticsParamsRoute,
  addSyntheticsParamsRoute,
  deleteSyntheticsParamsRoute,
  addPrivateLocationRoute,
  deletePrivateLocationRoute,
  getPrivateLocationsRoute,
];
