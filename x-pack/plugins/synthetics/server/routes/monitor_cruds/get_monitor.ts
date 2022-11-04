/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ConfigKey, MonitorOverviewItem, SyntheticsMonitor } from '../../../common/runtime_types';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { getMonitors, QuerySchema, SEARCH_FIELDS } from '../common';

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
  handler: async ({ request, savedObjectsClient, syntheticsMonitorClient }): Promise<any> => {
    const { filters, query } = request.query;
    const monitorsPromise = getMonitors(
      request.query,
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );

    if (filters || query) {
      const totalMonitorsPromise = savedObjectsClient.find({
        type: syntheticsMonitorType,
        perPage: 0,
        page: 1,
      });

      const allResolved = await Promise.all([monitorsPromise, totalMonitorsPromise]);
      const { saved_objects: monitors, per_page: perPageT, ...rest } = allResolved[0];
      const { total } = allResolved[1];

      return {
        ...rest,
        monitors,
        perPage: perPageT,
        absoluteTotal: total,
        syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
      };
    }

    const { saved_objects: monitors, per_page: perPageT, ...rest } = await monitorsPromise;

    return {
      ...rest,
      monitors,
      perPage: perPageT,
      absoluteTotal: rest.total,
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
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const { sortField, sortOrder, query } = request.query;
    const finder = savedObjectsClient.createPointInTimeFinder<SyntheticsMonitor>({
      type: syntheticsMonitorType,
      sortField: sortField === 'status' ? `${ConfigKey.NAME}.keyword` : sortField,
      sortOrder,
      perPage: 500,
      search: query ? `${query}*` : undefined,
      searchFields: SEARCH_FIELDS,
    });

    const allMonitorIds: string[] = [];
    let total = 0;
    const allMonitors: MonitorOverviewItem[] = [];

    for await (const result of finder.find()) {
      /* collect all monitor ids for use
       * in filtering overview requests */
      result.saved_objects.forEach((monitor) => {
        const id = monitor.id;
        allMonitorIds.push(id);

        /* for reach location, add a config item */
        const locations = monitor.attributes[ConfigKey.LOCATIONS];
        locations.forEach((location) => {
          const config = {
            id,
            name: monitor.attributes[ConfigKey.NAME],
            location,
            isEnabled: monitor.attributes[ConfigKey.ENABLED],
          };
          allMonitors.push(config);
          total++;
        });
      });
    }

    return {
      monitors: allMonitors,
      total,
      allMonitorIds,
    };
  },
});
