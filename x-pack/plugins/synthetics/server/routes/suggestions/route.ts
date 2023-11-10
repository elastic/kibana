/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import {
  ConfigKey,
  MonitorFiltersResult,
  EncryptedSyntheticsMonitorAttributes,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { QuerySchema, getMonitorFilters } from '../common';
import { getAllLocations } from '../../synthetics_service/get_all_locations';

type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

interface AggsResponse {
  locations: {
    buckets: Buckets;
  };
  tags: {
    buckets: Buckets;
  };
  projects: {
    buckets: Buckets;
  };
}

export const getSyntheticsSuggestionsRoute: SyntheticsRestApiRouteFactory<
  MonitorFiltersResult
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SUGGESTIONS,
  validate: {
    query: QuerySchema,
  },
  handler: async (route): Promise<any> => {
    const { savedObjectsClient } = route;
    const { tags, locations, projects, monitorQueryIds } = route.request.query;

    const { filtersStr } = await getMonitorFilters({
      tags,
      locations,
      projects,
      monitorQueryIds,
      context: route,
    });
    const { allLocations = [] } = await getAllLocations(route);
    const data = await savedObjectsClient.find<EncryptedSyntheticsMonitorAttributes>({
      type: syntheticsMonitorType,
      perPage: 1000,
      fields: ['name', 'id'],
      filter: filtersStr ? `${filtersStr}` : undefined,
      aggs,
    });

    const { tagsAggs, locationsAggs, projectsAggs } = (data?.aggregations as AggsResponse) ?? {};

    return {
      monitorIds: data.saved_objects.map(({ attributes }) => ({
        label: attributes.name,
        value: attributes.id,
        count: 1,
      })),
      tags:
        tagsAggs?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          value: key,
          count,
        })) ?? [],
      locations:
        locationsAggs?.buckets?.map(({ key, doc_count: count }) => ({
          label: allLocations.find((location) => location.id === key)?.label || key,
          value: key,
          count,
        })) ?? [],
      projects:
        projectsAggs?.buckets
          ?.filter(({ key }) => key)
          .map(({ key, doc_count: count }) => ({
            label: key,
            value: key,
            count,
          })) ?? [],
    };
  },
});

const aggs = {
  tagsAggs: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.TAGS}`,
      size: 10000,
      exclude: [''],
    },
  },
  locationsAggs: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
      exclude: [''],
    },
  },
  projectsAggs: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}`,
      size: 10000,
      exclude: [''],
    },
  },
};
