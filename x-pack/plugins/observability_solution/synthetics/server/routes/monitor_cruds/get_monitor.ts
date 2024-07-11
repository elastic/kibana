/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SyntheticsRestApiRouteFactory } from '../types';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  MonitorOverviewItem,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { getMonitorFilters, MonitorsQuery, QuerySchema, SEARCH_FIELDS } from '../common';
import { mapSavedObjectToMonitor } from './helper';
import { getSyntheticsMonitor } from '../../queries/get_monitor';

export const getSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR,
  validate: {},
  validation: {
    request: {
      params: schema.object({
        monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
      }),
      query: schema.object({
        decrypted: schema.maybe(schema.boolean()),
      }),
    },
  },
  handler: async ({
    request,
    response,
    server: { encryptedSavedObjects, coreStart },
    savedObjectsClient,
  }): Promise<any> => {
    const { monitorId } = request.params;
    try {
      const { decrypted } = request.query;

      if (!decrypted) {
        return mapSavedObjectToMonitor(
          await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
            syntheticsMonitorType,
            monitorId
          )
        );
      } else {
        // only user with write permissions can decrypt the monitor
        const canSave =
          (
            await coreStart?.capabilities.resolveCapabilities(request, {
              capabilityPath: 'uptime.*',
            })
          ).uptime.save ?? false;
        if (!canSave) {
          return response.forbidden();
        }

        const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();

        return await getSyntheticsMonitor({
          monitorId,
          encryptedSavedObjectsClient,
          savedObjectsClient,
        });
      }
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
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

    const { filtersStr } = await getMonitorFilters({
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

export function getOverviewConfigsPerLocation(
  attributes: EncryptedSyntheticsMonitorAttributes,
  queriedLocations?: string | string[]
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
    schedule: attributes[ConfigKey.SCHEDULE].number,
    tags: attributes[ConfigKey.TAGS],
    isEnabled: attributes[ConfigKey.ENABLED],
    type: attributes[ConfigKey.MONITOR_TYPE],
    projectId: attributes[ConfigKey.PROJECT_ID],
    isStatusAlertEnabled: isStatusEnabled(attributes[ConfigKey.ALERT_CONFIG]),
  }));
}
