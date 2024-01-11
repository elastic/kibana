/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import { RouteContext } from './types';
import { MonitorSortFieldSchema } from '../../common/runtime_types/monitor_management/sort_field';
import { getAllLocations } from '../synthetics_service/get_all_locations';
import { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { PrivateLocation, ServiceLocation } from '../../common/runtime_types';
import { monitorAttributes, syntheticsMonitorType } from '../../common/types/saved_objects';

const StringOrArraySchema = schema.maybe(
  schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
);

export const QuerySchema = schema.object({
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  sortField: MonitorSortFieldSchema,
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
  query: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  tags: StringOrArraySchema,
  monitorTypes: StringOrArraySchema,
  locations: StringOrArraySchema,
  projects: StringOrArraySchema,
  schedules: StringOrArraySchema,
  status: StringOrArraySchema,
  searchAfter: schema.maybe(schema.arrayOf(schema.string())),
  monitorQueryIds: StringOrArraySchema,
});

export type MonitorsQuery = TypeOf<typeof QuerySchema>;

export const OverviewStatusSchema = schema.object({
  query: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  tags: StringOrArraySchema,
  monitorTypes: StringOrArraySchema,
  locations: StringOrArraySchema,
  projects: StringOrArraySchema,
  schedules: StringOrArraySchema,
  status: StringOrArraySchema,
  scopeStatusByLocation: schema.maybe(schema.boolean()),
});

export type OverviewStatusQuery = TypeOf<typeof OverviewStatusSchema>;

export const SEARCH_FIELDS = [
  'name',
  'tags.text',
  'locations.id.text',
  'locations.label',
  'urls',
  'hosts',
  'project_id.text',
];

export const getMonitors = async (
  context: RouteContext<MonitorsQuery>,
  { fields }: { fields?: string[] } = {}
): Promise<SavedObjectsFindResponse<EncryptedSyntheticsMonitorAttributes>> => {
  const {
    perPage = 50,
    page,
    sortField,
    sortOrder,
    query,
    tags,
    monitorTypes,
    locations,
    filter = '',
    searchAfter,
    projects,
    schedules,
    monitorQueryIds,
  } = context.request.query;

  const { filtersStr } = await getMonitorFilters({
    filter,
    monitorTypes,
    tags,
    locations,
    projects,
    schedules,
    monitorQueryIds,
    context,
  });

  const findParams = {
    type: syntheticsMonitorType,
    perPage,
    page,
    sortField: parseMappingKey(sortField),
    sortOrder,
    searchFields: SEARCH_FIELDS,
    search: query ? `${query}*` : undefined,
    filter: filtersStr,
    searchAfter,
    fields,
  };

  return context.savedObjectsClient.find(findParams);
};

export const getMonitorFilters = async ({
  tags,
  filter,
  locations,
  projects,
  monitorTypes,
  schedules,
  monitorQueryIds,
  context,
}: {
  filter?: string;
  tags?: string | string[];
  monitorTypes?: string | string[];
  locations?: string | string[];
  projects?: string | string[];
  schedules?: string | string[];
  monitorQueryIds?: string | string[];
  context: RouteContext;
}) => {
  const locationFilter = await parseLocationFilter(context, locations);

  const filtersStr = [
    filter,
    getKqlFilter({ field: 'tags', values: tags }),
    getKqlFilter({ field: 'project_id', values: projects }),
    getKqlFilter({ field: 'type', values: monitorTypes }),
    getKqlFilter({ field: 'locations.id', values: locationFilter }),
    getKqlFilter({ field: 'schedule.number', values: schedules }),
    getKqlFilter({ field: 'id', values: monitorQueryIds }),
  ]
    .filter((f) => !!f)
    .join(' AND ');
  return { filtersStr, locationFilter };
};

export const getKqlFilter = ({
  field,
  values,
  operator = 'OR',
  searchAtRoot = false,
}: {
  field: string;
  values?: string | string[];
  operator?: string;
  searchAtRoot?: boolean;
}) => {
  if (!values) {
    return '';
  }
  let fieldKey = '';
  if (searchAtRoot) {
    fieldKey = `${field}`;
  } else {
    fieldKey = `${monitorAttributes}.${field}`;
  }

  if (Array.isArray(values)) {
    return ` (${fieldKey}:"${values.join(`" ${operator} ${fieldKey}:"`)}" )`;
  }

  return `${fieldKey}:"${values}"`;
};

const parseLocationFilter = async (context: RouteContext, locations?: string | string[]) => {
  if (!locations || locations?.length === 0) {
    return;
  }

  const { allLocations } = await getAllLocations(context);

  if (Array.isArray(locations)) {
    return locations
      .map((loc) => findLocationItem(loc, allLocations)?.id ?? '')
      .filter((val) => !!val);
  }

  return [findLocationItem(locations, allLocations)?.id ?? ''];
};

export const findLocationItem = (
  query: string,
  locations: Array<ServiceLocation | PrivateLocation>
) => {
  return locations.find(({ id, label }) => query === id || label === query);
};

/**
 * Returns whether the query is likely to return a subset of monitor objects.
 * Useful where `absoluteTotal` needs to be determined with a separate call
 * @param monitorQuery { MonitorsQuery }
 */
export const isMonitorsQueryFiltered = (monitorQuery: MonitorsQuery) => {
  const {
    query,
    tags,
    monitorTypes,
    locations,
    status,
    filter,
    projects,
    schedules,
    monitorQueryIds,
  } = monitorQuery;

  return (
    !!query ||
    !!filter ||
    !!locations?.length ||
    !!monitorTypes?.length ||
    !!tags?.length ||
    !!status?.length ||
    !!projects?.length ||
    !!schedules?.length ||
    !!monitorQueryIds?.length
  );
};

function parseMappingKey(key: string | undefined) {
  switch (key) {
    case 'schedule.keyword':
      return 'schedule.number';
    case 'project_id.keyword':
      return 'project_id';
    default:
      return key;
  }
}
