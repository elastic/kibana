/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath, { Unit } from '@kbn/datemath';
import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { ConfigKey } from '../../../common/runtime_types';
import { QuerySchema, MonitorsQuery } from '../common';

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
export async function getStatus(
  server: UptimeServerSetup,
  uptimeEsClient: UptimeEsClient,
  soClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  params: MonitorsQuery
) {
  const { query } = params;
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */

  const allMonitors = await getAllMonitors({
    soClient,
    search: query ? `${query}*` : undefined,
    fields: [
      ConfigKey.ENABLED,
      ConfigKey.LOCATIONS,
      ConfigKey.MONITOR_QUERY_ID,
      ConfigKey.SCHEDULE,
      ConfigKey.MONITOR_SOURCE_TYPE,
    ],
  });

  const {
    enabledIds,
    disabledCount,
    maxPeriod,
    listOfLocations,
    monitorLocationMap,
    disabledMonitorsCount,
    projectMonitorsCount,
  } = await processMonitors(allMonitors, server, soClient, syntheticsMonitorClient);

  const { up, down, pending, upConfigs, downConfigs } = await queryMonitorStatus(
    uptimeEsClient,
    listOfLocations,
    { from: maxPeriod, to: 'now' },
    enabledIds,
    monitorLocationMap
  );

  return {
    allMonitorsCount: allMonitors.length,
    disabledMonitorsCount,
    projectMonitorsCount,
    enabledIds,
    disabledCount,
    up,
    down,
    pending,
    upConfigs,
    downConfigs,
  };
}

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: QuerySchema,
  },
  handler: async ({
    server,
    uptimeEsClient,
    savedObjectsClient,
    syntheticsMonitorClient,
    request,
  }): Promise<any> => {
    const params = request.query;
    return await getStatus(
      server,
      uptimeEsClient,
      savedObjectsClient,
      syntheticsMonitorClient,
      params
    );
  },
});
