/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { OverviewFilters } from '../../../common/runtime_types';
import { generateFilterAggs } from './generate_filter_aggs';

export interface GetFilterBarParams {
  /** @param dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member search this value should correspond to Elasticsearch DSL
   *  generated from KQL text the user provided.
   */
  search?: Record<string, any>;
  filterOptions: Record<string, string[] | number[]>;
}

export const combineRangeWithFilters = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: Record<string, any>
) => {
  const range = {
    range: {
      '@timestamp': {
        gte: dateRangeStart,
        lte: dateRangeEnd,
      },
    },
  };
  if (!filters?.bool) return range;
  const clientFiltersList = Array.isArray(filters?.bool?.filter ?? {})
    ? // i.e. {"bool":{"filter":{ ...some nested filter objects }}}
      filters.bool.filter
    : // i.e. {"bool":{"filter":[ ...some listed filter objects ]}}
      Object.keys(filters?.bool?.filter ?? {}).map((key) => ({
        ...filters?.bool?.filter?.[key],
      }));
  filters.bool.filter = [...clientFiltersList, range];
  return filters;
};

export const getFilterBar: UMElasticsearchQueryFn<GetFilterBarParams, OverviewFilters> = async ({
  uptimeEsClient,
  dateRangeStart,
  dateRangeEnd,
  search,
  filterOptions,
}) => {
  const aggs = generateFilterAggs(
    [
      { aggName: 'locations', filterName: 'locations', field: 'observer.geo.name' },
      { aggName: 'ports', filterName: 'ports', field: 'url.port' },
      { aggName: 'schemes', filterName: 'schemes', field: 'monitor.type' },
      { aggName: 'tags', filterName: 'tags', field: 'tags' },
    ],
    filterOptions
  );
  const filters = combineRangeWithFilters(dateRangeStart, dateRangeEnd, search);
  const searchBody = {
    size: 0,
    query: {
      ...filters,
    },
    aggs,
  };

  const {
    body: { aggregations },
  } = await uptimeEsClient.search({ body: searchBody });

  const { tags, locations, ports, schemes } = aggregations ?? {};

  return {
    locations: locations?.term?.buckets.map((item) => item.key as string),
    ports: ports?.term?.buckets.map((item) => item.key as number),
    schemes: schemes?.term?.buckets.map((item) => item.key as string),
    tags: tags?.term?.buckets.map((item) => item.key as string),
  };
};
