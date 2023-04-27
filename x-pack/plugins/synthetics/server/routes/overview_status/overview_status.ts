/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { intersection } from 'lodash';
import datemath, { Unit } from '@kbn/datemath';
import moment from 'moment';
import { ConfigKey } from '../../../common/runtime_types';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { getMonitorFilters, OverviewStatusSchema, OverviewStatusQuery } from '../common';

/**
 * Helper function that converts a monitor's schedule to a value to use to generate
 * an appropriate look-back window for snapshot count.
 * @param schedule a number/unit pair that represents how often a configured monitor runs
 * @returns schedule interval in ms
 */
export function periodToMs(schedule: { number: string; unit: Unit }) {
  if (Object.keys(datemath.unitsMap).indexOf(schedule.unit) === -1) return 0;

  return parseInt(schedule.number, 10) * datemath.unitsMap[schedule.unit].base;
}

/**
 * Multi-stage function that first queries all the user's saved object monitor configs.
 *
 * Subsequently, fetch the status for each monitor per location in the data streams.
 * @returns The counts of up/down/disabled monitor by location, and a map of each monitor:location status.
 */
export async function getStatus(context: RouteContext, params: OverviewStatusQuery) {
  const { uptimeEsClient, syntheticsMonitorClient, savedObjectsClient, server } = context;

  const { query, locations: qLocations, scopeStatusByLocation = true } = params;

  const queryLocations = qLocations && !Array.isArray(qLocations) ? [qLocations] : qLocations;
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */

  const filtersStr = await getMonitorFilters({
    ...params,
    context,
  });

  const allMonitors = await getAllMonitors({
    soClient: savedObjectsClient,
    search: query ? `${query}*` : undefined,
    filter: filtersStr,
    fields: [
      ConfigKey.ENABLED,
      ConfigKey.LOCATIONS,
      ConfigKey.MONITOR_QUERY_ID,
      ConfigKey.CONFIG_ID,
      ConfigKey.SCHEDULE,
      ConfigKey.MONITOR_SOURCE_TYPE,
    ],
  });

  const {
    enabledMonitorQueryIds,
    disabledMonitorQueryIds,
    allIds,
    disabledCount,
    maxPeriod,
    listOfLocations,
    monitorLocationMap,
    disabledMonitorsCount,
    projectMonitorsCount,
    monitorQueryIdToConfigIdMap,
  } = await processMonitors(
    allMonitors,
    server,
    savedObjectsClient,
    syntheticsMonitorClient,
    queryLocations
  );

  // Account for locations filter
  const listOfLocationAfterFilter =
    queryLocations && scopeStatusByLocation
      ? intersection(listOfLocations, queryLocations)
      : listOfLocations;

  const range = {
    from: moment().subtract(maxPeriod, 'milliseconds').subtract(20, 'minutes').toISOString(),
    to: 'now',
  };

  const { up, down, pending, upConfigs, downConfigs, pendingConfigs } = await queryMonitorStatus(
    uptimeEsClient,
    listOfLocationAfterFilter,
    range,
    enabledMonitorQueryIds,
    monitorLocationMap,
    monitorQueryIdToConfigIdMap
  );

  return {
    allIds,
    allMonitorsCount: allMonitors.length,
    disabledMonitorsCount,
    projectMonitorsCount,
    enabledMonitorQueryIds,
    disabledMonitorQueryIds,
    disabledCount,
    up,
    down,
    pending,
    upConfigs,
    downConfigs,
    pendingConfigs,
  };
}

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: OverviewStatusSchema,
  },
  handler: async (routeContext): Promise<any> => {
    const { request } = routeContext;

    const params = request.query as OverviewStatusQuery;
    return await getStatus(routeContext, params);
  },
});
