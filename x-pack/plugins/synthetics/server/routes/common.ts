/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { SyntheticsService } from '../synthetics_service/synthetics_service';
import { EncryptedSyntheticsMonitor, ServiceLocations } from '../../common/runtime_types';
import { monitorAttributes } from '../../common/types/saved_objects';
import { syntheticsMonitorType } from '../legacy_uptime/lib/saved_objects/synthetics_monitor';

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
  fields: schema.maybe(schema.arrayOf(schema.string())),
  searchAfter: schema.maybe(schema.arrayOf(schema.string())),
});

type MonitorsQuery = TypeOf<typeof querySchema>;

export const getMonitors = (
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
    fields,
    searchAfter,
  } = request as MonitorsQuery;

  const locationFilter = parseLocationFilter(syntheticsService.locations, locations);

  const filters =
    getKqlFilter('tags', tags) +
    getKqlFilter('type', monitorType) +
    getKqlFilter('locations.id', locationFilter);

  return savedObjectsClient.find({
    type: syntheticsMonitorType,
    perPage,
    page,
    sortField: sortField === 'schedule.keyword' ? 'schedule.number' : sortField,
    sortOrder,
    searchFields: ['name', 'tags.text', 'locations.id.text', 'urls'],
    search: query ? `${query}*` : undefined,
    filter: filters + filter,
    fields,
    searchAfter,
  });
};

export const getKqlFilter = (field: string, values?: string | string[], operator = 'OR') => {
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
