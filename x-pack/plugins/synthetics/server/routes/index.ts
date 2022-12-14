/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexSizesRoute } from './settings/settings';
import { getAPIKeySyntheticsRoute } from './monitor_cruds/get_api_key';
import { getServiceLocationsRoute } from './synthetics_service/get_service_locations';
import { deleteSyntheticsMonitorRoute } from './monitor_cruds/delete_monitor';
import {
  disableSyntheticsRoute,
  enableSyntheticsRoute,
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
import { createGetCurrentStatusRoute } from './status/current_status';
import {
  SyntheticsRestApiRouteFactory,
  SyntheticsStreamingRouteFactory,
} from '../legacy_uptime/routes';
import { getHasZipUrlMonitorRoute } from './fleet/get_has_zip_url_monitors';

export const syntheticsAppRestApiRoutes: SyntheticsRestApiRouteFactory[] = [
  addSyntheticsMonitorRoute,
  addSyntheticsProjectMonitorRoute,
  getSyntheticsEnablementRoute,
  deleteSyntheticsMonitorRoute,
  deleteSyntheticsMonitorProjectRoute,
  disableSyntheticsRoute,
  editSyntheticsMonitorRoute,
  enableSyntheticsRoute,
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
  getHasZipUrlMonitorRoute,
  createGetCurrentStatusRoute,
  getIndexSizesRoute,
];

export const syntheticsAppStreamingApiRoutes: SyntheticsStreamingRouteFactory[] = [
  addSyntheticsProjectMonitorRouteLegacy,
];
