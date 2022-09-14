/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import datemath, { Unit } from '@kbn/datemath';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { getMonitors } from '../util';
import { getSnapshotCount } from '../../legacy_uptime/lib/requests/get_snapshot_counts';
import { UptimeESClient } from '../../legacy_uptime/lib/lib';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

const DEFAULT_DATE_RANGE_START = 'now-1h';

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

function snapshotFilters(ids: Array<string | undefined>) {
  return `{"terms": { "monitor.id": ${JSON.stringify(ids)}}}`;
}

export async function getCounts(
  uptimeEsClient: UptimeESClient,
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient
) {
  let monitors;
  const enabledIds: Array<string | undefined> = [];
  const disabledIds: Array<string | undefined> = [];
  let disabledCount = 0;
  let page = 1;
  let maxPeriod = 0;
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
      },
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );
    page++;
    monitors.saved_objects.forEach((monitor) => {
      if (monitor.attributes.enabled === false) {
        disabledIds.push(monitor.id);
        disabledCount += monitor.attributes.locations.length;
      } else {
        enabledIds.push(monitor.id);
        maxPeriod = Math.max(maxPeriod, periodToMs(monitor.attributes.schedule));
      }
    });
  } while (monitors.saved_objects.length === monitors.per_page);

  // get a status count for all enabled monitors
  const snapshot = await getSnapshotCount({
    uptimeEsClient,
    dateRangeEnd: 'now',
    dateRangeStart: String(
      datemath.parse('now')?.valueOf()! - maxPeriod ?? DEFAULT_DATE_RANGE_START
    ),
    filters: snapshotFilters(enabledIds),
  });
  return {
    snapshot,
    disabledCount,
    disabledIds,
    enabledIds,
  };
}

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: schema.object({}),
  },
  handler: async ({
    uptimeEsClient,
    savedObjectsClient,
    syntheticsMonitorClient,
    response,
  }): Promise<any> => {
    return response.ok({
      body: await getCounts(uptimeEsClient, savedObjectsClient, syntheticsMonitorClient),
    });
  },
});
