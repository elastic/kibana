/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath, { Unit } from '@kbn/datemath';
import { SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { ConfigKey, ServiceLocation } from '../../../common/runtime_types';
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
  const enabledIds: string[] = [];
  let disabledCount = 0;
  let maxPeriod = 0;
  let listOfLocationsSet = new Set<string>();
  const monitorLocationMap: Record<string, string[]> = {};
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */

  const allMonitors = await getAllMonitors({
    soClient,
    search: `${query}*`,
    fields: [
      ConfigKey.ENABLED,
      ConfigKey.LOCATIONS,
      ConfigKey.MONITOR_QUERY_ID,
      ConfigKey.SCHEDULE,
    ],
  });

  let allLocations: ServiceLocation[] | null = null;

  const getLocationLabel = async (locationId: string) => {
    if (!allLocations) {
      const { publicLocations, privateLocations } = await getAllLocations(
        server,
        syntheticsMonitorClient,
        soClient
      );

      allLocations = [...publicLocations, ...privateLocations];
    }

    return allLocations.find((loc) => loc.id === locationId)?.label ?? locationId;
  };

  for (const monitor of allMonitors) {
    const attrs = monitor.attributes;
    if (attrs[ConfigKey.ENABLED] === false) {
      disabledCount += attrs[ConfigKey.LOCATIONS].length;
    } else {
      const missingLabels = new Set<string>();

      enabledIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
      const monLocs = new Set([
        ...(attrs[ConfigKey.LOCATIONS]
          .filter((loc) => {
            if (!loc.label) {
              missingLabels.add(loc.id);
            }
            return loc.label;
          })
          .map((location) => location.label) as string[]),
      ]);

      // since label wasn't always part of location, there can be a case where we have a location
      // with an id but no label. We need to fetch the label from the API
      // Adding a migration to add the label to the saved object is a future consideration
      const locLabels = await pMap([...missingLabels], async (locationId) =>
        getLocationLabel(locationId)
      );

      monitorLocationMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = [...monLocs, ...locLabels];
      listOfLocationsSet = new Set([...listOfLocationsSet, ...monLocs, ...locLabels]);

      maxPeriod = Math.max(maxPeriod, periodToMs(attrs[ConfigKey.SCHEDULE]));
    }
  }

  const { up, down, pending, upConfigs, downConfigs } = await queryMonitorStatus(
    uptimeEsClient,
    [...listOfLocationsSet],
    { from: maxPeriod, to: 'now' },
    enabledIds,
    monitorLocationMap
  );

  return {
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

export const resolveMissingLabels = async (
  server: UptimeServerSetup,
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  listOfLocationsSet: Set<string>,
  missingLabelLocations: Set<string>
) => {
  const listOfLocations = Array.from(listOfLocationsSet);

  if (missingLabelLocations.size > 0) {
    const { publicLocations, privateLocations } = await getAllLocations(
      server,
      syntheticsMonitorClient,
      savedObjectsClient
    );

    const locations = [...publicLocations, ...privateLocations];

    missingLabelLocations.forEach((id) => {
      const location = locations.find((loc) => loc.id === id);
      if (location) {
        listOfLocations.push(location.label);
      }
    });
    return { listOfLocations };
  }

  return { listOfLocations };
};
