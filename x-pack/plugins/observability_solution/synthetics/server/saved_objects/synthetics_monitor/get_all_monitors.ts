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
import { intersection } from 'lodash';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { periodToMs } from '../../routes/overview_status/overview_status';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  SourceType,
} from '../../../common/runtime_types';

export const getAllMonitors = async ({
  soClient,
  search,
  fields,
  filter,
  sortField = 'name.keyword',
  sortOrder = 'asc',
  searchFields,
  showFromAllSpaces,
}: {
  soClient: SavedObjectsClientContract;
  search?: string;
  filter?: string;
  showFromAllSpaces?: boolean;
} & Pick<SavedObjectsFindOptions, 'sortField' | 'sortOrder' | 'fields' | 'searchFields'>) => {
  const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
    type: syntheticsMonitorType,
    perPage: 1000,
    search,
    sortField,
    sortOrder,
    fields,
    filter,
    searchFields,
    ...(showFromAllSpaces && { namespaces: ['*'] }),
  });

  const hits: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
  for await (const result of finder.find()) {
    hits.push(...result.saved_objects);
  }

  finder.close().catch(() => {});

  return hits;
};

export const processMonitors = (
  allMonitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>,
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
  const monitorLocationsMap: Record<string, string[]> = {};
  const monitorQueryIdToConfigIdMap: Record<string, string> = {};

  for (const monitor of allMonitors) {
    const attrs = monitor.attributes;

    allIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);

    projectMonitorsCount += attrs?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT ? 1 : 0;

    monitorQueryIdToConfigIdMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = attrs[ConfigKey.CONFIG_ID];

    const monitorLocations = attrs[ConfigKey.LOCATIONS].map((location) => location.id);

    if (attrs[ConfigKey.ENABLED] === false) {
      const queriedLocations = Array.isArray(queryLocations) ? queryLocations : [queryLocations];
      const intersectingLocations = intersection(
        monitorLocations,
        queryLocations ? queriedLocations : monitorLocations
      );
      disabledCount += intersectingLocations.length;
      disabledMonitorsCount += 1;
      disabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
    } else {
      enabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);

      monitorLocationsMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = queryLocations
        ? intersection(monitorLocations, queryLocations)
        : monitorLocations;
      listOfLocationsSet = new Set([...listOfLocationsSet, ...monitorLocations]);

      maxPeriod = Math.max(maxPeriod, periodToMs(attrs[ConfigKey.SCHEDULE]));
    }
  }

  return {
    maxPeriod,
    allIds,
    enabledMonitorQueryIds,
    disabledMonitorQueryIds,
    disabledCount,
    monitorLocationsMap,
    disabledMonitorsCount,
    projectMonitorsCount,
    monitorLocationIds: [...listOfLocationsSet],
    monitorQueryIdToConfigIdMap,
  };
};
