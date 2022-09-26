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
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  ServiceLocations,
} from '../../../common/runtime_types';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';

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
  syntheticsService: SyntheticsService,
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

  const locationFilter = parseLocationFilter(syntheticsService.locations, locations);

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
    query: querySchema,
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

export const getSyntheticsMonitorOverviewRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW,
  validate: {
    query: querySchema,
  },
  handler: async ({ request, savedObjectsClient, syntheticsMonitorClient }): Promise<any> => {
    const { perPage = 5 } = request.query;
    const { saved_objects: monitors } = await getMonitors(
      {
        perPage: 1000,
        sortField: 'name.keyword',
        sortOrder: 'asc',
        page: 1,
      },
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );

    const allMonitorIds: string[] = [];
    const pages: Record<number, unknown[]> = {};
    let currentPage = 0;
    let currentItem = 0;
    let total = 0;

    monitors.forEach((monitor) => {
      /* collect all monitor ids for use
       * in filtering overview requests */
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
