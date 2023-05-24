/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorOverviewItem,
} from '../../../common/runtime_types';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  getMonitorFilters,
  getMonitors,
  isMonitorsQueryFiltered,
  MonitorsQuery,
  QuerySchema,
  SEARCH_FIELDS,
} from '../common';

export const getSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    request,
    response,
    server: { encryptedSavedObjects },
    savedObjectsClient,
  }): Promise<any> => {
    const { monitorId } = request.params;
    const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();
    try {
      return await libs.requests.getSyntheticsMonitor({
        monitorId,
        encryptedSavedObjectsClient,
        savedObjectsClient,
      });
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});

export const getAllSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: QuerySchema,
  },
  handler: async (routeContext): Promise<any> => {
    const { request, savedObjectsClient, syntheticsMonitorClient } = routeContext;
    const totalCountQuery = async () => {
      if (isMonitorsQueryFiltered(request.query)) {
        return savedObjectsClient.find({
          type: syntheticsMonitorType,
          perPage: 0,
          page: 1,
        });
      }
    };

    const [queryResult, totalCount] = await Promise.all([
      getMonitors(routeContext),
      totalCountQuery(),
    ]);

    const absoluteTotal = totalCount?.total ?? queryResult.total;

    const { saved_objects: monitors, per_page: perPageT, ...rest } = queryResult;

    return {
      ...rest,
      monitors,
      absoluteTotal,
      perPage: perPageT,
      syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
    };
  },
});

export const getSyntheticsMonitorOverviewRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW,
  validate: {
    query: QuerySchema,
  },
  handler: async (routeContext): Promise<any> => {
    const { request, savedObjectsClient } = routeContext;

    const {
      sortField,
      sortOrder,
      query,
      locations: queriedLocations,
    } = request.query as MonitorsQuery;

    const filtersStr = await getMonitorFilters({
      ...request.query,
      context: routeContext,
    });

    const allMonitorConfigs = await getAllMonitors({
      sortOrder,
      filter: filtersStr,
      soClient: savedObjectsClient,
      sortField: sortField === 'status' ? `${ConfigKey.NAME}.keyword` : sortField,
      search: query ? `${query}*` : undefined,
      searchFields: SEARCH_FIELDS,
    });

    const allMonitorIds: string[] = [];
    let total = 0;
    const allMonitors: MonitorOverviewItem[] = [];

    for (const { attributes } of allMonitorConfigs) {
      const configId = attributes[ConfigKey.CONFIG_ID];
      allMonitorIds.push(configId);

      const monitorConfigsPerLocation = getOverviewConfigsPerLocation(attributes, queriedLocations);
      allMonitors.push(...monitorConfigsPerLocation);
      total += monitorConfigsPerLocation.length;
    }

    return {
      monitors: allMonitors,
      total,
      allMonitorIds,
    };
  },
});

function getOverviewConfigsPerLocation(
  attributes: EncryptedSyntheticsMonitor,
  queriedLocations: string | string[] | undefined
) {
  const id = attributes[ConfigKey.MONITOR_QUERY_ID];
  const configId = attributes[ConfigKey.CONFIG_ID];

  /* for each location, add a config item */
  const locations = attributes[ConfigKey.LOCATIONS];
  const queriedLocationsArray =
    queriedLocations && !Array.isArray(queriedLocations) ? [queriedLocations] : queriedLocations;

  /* exclude nob matching locations if location filter is present */
  const filteredLocations = queriedLocationsArray?.length
    ? locations.filter(
        (loc) =>
          (loc.label && queriedLocationsArray.includes(loc.label)) ||
          queriedLocationsArray.includes(loc.id)
      )
    : locations;

  return filteredLocations.map((location) => ({
    id,
    configId,
    location,
    name: attributes[ConfigKey.NAME],
    tags: attributes[ConfigKey.TAGS],
    isEnabled: attributes[ConfigKey.ENABLED],
    type: attributes[ConfigKey.MONITOR_TYPE],
    projectId: attributes[ConfigKey.PROJECT_ID],
    isStatusAlertEnabled: isStatusEnabled(attributes[ConfigKey.ALERT_CONFIG]),
  }));
}
