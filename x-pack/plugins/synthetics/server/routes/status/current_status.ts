/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath, { Unit } from '@kbn/datemath';
import { IKibanaResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { getMonitors } from '../common';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { ConfigKey, OverviewStatus } from '../../../common/runtime_types';
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
  uptimeEsClient: UptimeEsClient,
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  params: MonitorsQuery
) {
  const { query } = params;
  let monitors;
  const enabledIds: string[] = [];
  let disabledCount = 0;
  let page = 1;
  let maxPeriod = 0;
  let maxLocations = 1;
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */
  do {
    monitors = await getMonitors(
      {
        perPage: 500,
        page,
        sortField: 'name.keyword',
        sortOrder: 'asc',
        query,
        fields: [
          ConfigKey.ENABLED,
          ConfigKey.LOCATIONS,
          ConfigKey.MONITOR_QUERY_ID,
          ConfigKey.SCHEDULE,
        ],
      },
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );
    page++;
    monitors.saved_objects.forEach((monitor) => {
      const attrs = monitor.attributes;
      if (attrs[ConfigKey.ENABLED] === false) {
        disabledCount += attrs[ConfigKey.LOCATIONS].length;
      } else {
        enabledIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
        maxLocations = Math.max(maxLocations, attrs[ConfigKey.LOCATIONS].length);
        maxPeriod = Math.max(maxPeriod, periodToMs(attrs[ConfigKey.SCHEDULE]));
      }
    });
  } while (monitors.saved_objects.length === monitors.per_page);

  const { up, down, upConfigs, downConfigs } = await queryMonitorStatus(
    uptimeEsClient,
    maxLocations,
    { from: maxPeriod, to: 'now' },
    enabledIds
  );

  return {
    enabledIds,
    disabledCount,
    up,
    down,
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
    uptimeEsClient,
    savedObjectsClient,
    syntheticsMonitorClient,
    response,
    request,
  }): Promise<IKibanaResponse<OverviewStatus>> => {
    const params = request.query;
    return response.ok({
      body: await getStatus(uptimeEsClient, savedObjectsClient, syntheticsMonitorClient, params),
    });
  },
});
