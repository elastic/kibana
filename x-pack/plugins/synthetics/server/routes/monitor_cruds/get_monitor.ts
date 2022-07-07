/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { EncryptedSyntheticsMonitor, ServiceLocations } from '../../../common/runtime_types';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';

const querySchema = schema.object({
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
  query: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  tags: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  monitorType: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  locations: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  status: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
});

type MonitorsQuery = TypeOf<typeof querySchema>;

const getMonitors = (
  request: MonitorsQuery,
  server: UptimeServerSetup,
  savedObjectsClient: SavedObjectsClientContract
): Promise<SavedObjectsFindResponse<EncryptedSyntheticsMonitor>> => {
  const {
    perPage = 50,
    page,
    sortField,
    sortOrder,
    query,
    tags,
    monitorType,
    locations,
    filter = '',
  } = request as MonitorsQuery;

  const locationFilter = parseLocationFilter(server.syntheticsService.locations, locations);

  const filters =
    getFilter('tags', tags) +
    getFilter('type', monitorType) +
    getFilter('locations.id', locationFilter);

  return savedObjectsClient.find({
    type: syntheticsMonitorType,
    perPage,
    page,
    sortField: sortField === 'schedule.keyword' ? 'schedule.number' : sortField,
    sortOrder,
    searchFields: ['name', 'tags.text', 'locations.id.text', 'urls'],
    search: query ? `${query}*` : undefined,
    filter: filters + filter,
  });
};

export const getSyntheticsMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
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

export const getAllSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: querySchema,
  },
  handler: async ({ request, savedObjectsClient, server }): Promise<any> => {
    const { filters, query } = request.query;
    const monitorsPromise = getMonitors(request.query, server, savedObjectsClient);

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
        syncErrors: server.syntheticsService.syncErrors,
      };
    }

    const { saved_objects: monitors, per_page: perPageT, ...rest } = await monitorsPromise;

    return {
      ...rest,
      monitors,
      perPage: perPageT,
      absoluteTotal: rest.total,
      syncErrors: server.syntheticsService.syncErrors,
    };
  },
});

const getFilter = (field: string, values?: string | string[], operator = 'OR') => {
  if (!values) {
    return '';
  }

  const fieldKey = `${monitorAttributes}.${field}`;

  if (Array.isArray(values)) {
    return `${fieldKey}:${values.join(` ${operator} ${fieldKey}:`)}`;
  }

  return `${fieldKey}:${values}`;
};

const parseLocationFilter = (serviceLocations: ServiceLocations, locations?: string | string[]) => {
  if (!locations) {
    return '';
  }

  if (Array.isArray(locations)) {
    return locations
      .map((loc) => findLocationItem(loc, serviceLocations)?.id ?? '')
      .filter((val) => !val);
  }

  return findLocationItem(locations, serviceLocations)?.id ?? '';
};

export const findLocationItem = (query: string, locations: ServiceLocations) => {
  return locations.find(({ id, label }) => query === id || label === query);
};

export const getSyntheticsMonitorOverviewRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_OVERVIEW,
  validate: {
    query: querySchema,
  },
  handler: async ({ request, savedObjectsClient, server }): Promise<any> => {
    const { perPage = 5 } = request.query;
    const { saved_objects: monitors } = await getMonitors(
      {
        perPage: 1000,
        sortField: 'name.keyword',
        sortOrder: 'asc',
        page: 1,
      },
      server,
      savedObjectsClient
    );

    const allMonitorIds: string[] = [];
    const pages: Record<number, unknown[]> = {};
    let currentPage = 1;
    let currentItem = 0;
    let total = 0;

    monitors.forEach((monitor) => {
      /* collect all monitor ids for use
       * in filtering overview requests */
      const id = monitor.id;
      allMonitorIds.push(id);

      /* for reach location, add a config item */
      const locations = monitor.attributes.locations;
      locations.forEach((location) => {
        const config = {
          id,
          name: monitor.attributes.name,
          location,
        };
        if (!pages[currentPage]) {
          pages[currentPage] = [config];
        } else {
          pages[currentPage].push(config);
        }
        currentItem++;
        total++;
        if (currentItem % perPage === 0) {
          currentPage++;
          currentItem = 0;
        }
      });
    });

    return {
      pages,
      total,
      allMonitorIds,
    };
  },
});
