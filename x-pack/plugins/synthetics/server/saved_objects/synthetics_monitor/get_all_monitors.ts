/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import pMap from 'p-map';
import { intersection } from 'lodash';
import { periodToMs } from '../../routes/overview_status/overview_status';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  ServiceLocation,
  SourceType,
} from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

export const getAllMonitors = async ({
  soClient,
  search,
  fields,
  filter,
  sortField = 'name.keyword',
  sortOrder = 'asc',
  searchFields,
}: {
  soClient: SavedObjectsClientContract;
  search?: string;
  filter?: string;
} & Pick<SavedObjectsFindOptions, 'sortField' | 'sortOrder' | 'fields' | 'searchFields'>) => {
  const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitor>({
    type: syntheticsMonitorType,
    perPage: 1000,
    search,
    sortField,
    sortOrder,
    fields,
    filter,
    searchFields,
  });

  const hits: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];
  for await (const result of finder.find()) {
    hits.push(...result.saved_objects);
  }

  // no need to wait for it
  finder.close();

  return hits;
};

export const processMonitors = async (
  allMonitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>,
  server: UptimeServerSetup,
  soClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  queryLocations?: string[] | string
) => {
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */
  const enabledMonitorQueryIds: string[] = [];
  const disabledMonitorQueryIds: string[] = [];
  let disabledCount = 0;
  let disabledMonitorsCount = 0;
  let maxPeriod = 0;
  let projectMonitorsCount = 0;
  const allIds: string[] = [];
  let listOfLocationsSet = new Set<string>();
  const monitorLocationMap: Record<string, string[]> = {};
  const monitorQueryIdToConfigIdMap: Record<string, string> = {};

  let allLocations: ServiceLocation[] | null = null;

  const getLocationLabel = async (locationId: string) => {
    if (!allLocations) {
      const { publicLocations, privateLocations } = await getAllLocations({
        server,
        syntheticsMonitorClient,
        savedObjectsClient: soClient,
      });

      allLocations = [...publicLocations, ...privateLocations];
    }

    return allLocations.find((loc) => loc.id === locationId)?.label ?? locationId;
  };

  for (const monitor of allMonitors) {
    const attrs = monitor.attributes;

    allIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);

    projectMonitorsCount += attrs?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT ? 1 : 0;

    monitorQueryIdToConfigIdMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = attrs[ConfigKey.CONFIG_ID];

    if (attrs[ConfigKey.ENABLED] === false) {
      const monitorLocations = attrs[ConfigKey.LOCATIONS].map((location) => location.label);
      const queriedLocations = Array.isArray(queryLocations) ? queryLocations : [queryLocations];
      const intersectingLocations = intersection(
        monitorLocations,
        queryLocations ? queriedLocations : monitorLocations
      );
      disabledCount += intersectingLocations.length;
      disabledMonitorsCount += 1;
      disabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
    } else {
      const missingLabels = new Set<string>();

      enabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
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

      const monitorLocations = [...monLocs, ...locLabels];
      monitorLocationMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = queryLocations
        ? intersection(monitorLocations, queryLocations)
        : monitorLocations;
      listOfLocationsSet = new Set([...listOfLocationsSet, ...monLocs, ...locLabels]);

      maxPeriod = Math.max(maxPeriod, periodToMs(attrs[ConfigKey.SCHEDULE]));
    }
  }

  return {
    maxPeriod,
    allIds,
    enabledMonitorQueryIds,
    disabledMonitorQueryIds,
    disabledCount,
    monitorLocationMap,
    disabledMonitorsCount,
    projectMonitorsCount,
    listOfLocations: [...listOfLocationsSet],
    monitorQueryIdToConfigIdMap,
  };
};
