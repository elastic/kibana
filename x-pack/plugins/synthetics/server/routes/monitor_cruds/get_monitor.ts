/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ServiceLocations } from '../../../common/runtime_types';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';

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

export const getAllSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    query: querySchema,
  },
  handler: async ({ request, savedObjectsClient, server }): Promise<any> => {
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
    } = request.query as MonitorsQuery;

    const locationFilter = parseLocationFilter(server.syntheticsService.locations, locations);

    const filters =
      getFilter('tags', tags) +
      getFilter('type', monitorType) +
      getFilter('locations.id', locationFilter);

    const monitorsPromise = savedObjectsClient.find({
      type: syntheticsMonitorType,
      perPage,
      page,
      sortField,
      sortOrder,
      searchFields: ['name', 'tags.text', 'locations.id.text', 'urls'],
      search: query ? `${query}*` : undefined,
      filter: filters + filter,
    });

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
        allTotal: total,
        syncErrors: server.syntheticsService.syncErrors,
      };
    }

    const { saved_objects: monitors, per_page: perPageT, ...rest } = await monitorsPromise;

    return {
      ...rest,
      monitors,
      perPage: perPageT,
      allTotal: rest.total,
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
