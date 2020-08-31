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

type SupportedFields = 'locations' | 'ports' | 'schemes' | 'tags';

export const extractFilterAggsResults = (
  responseAggregations: Record<string, any>,
  keys: SupportedFields[]
): OverviewFilters => {
  const values: OverviewFilters = {
    locations: [],
    ports: [],
    schemes: [],
    tags: [],
  };
  keys.forEach((key) => {
    const buckets = responseAggregations?.[key]?.term?.buckets ?? [];
    values[key] = buckets.map((item: { key: string | number }) => item.key);
  });
  return values;
};

export const getFilterBar: UMElasticsearchQueryFn<GetFilterBarParams, OverviewFilters> = async ({
  callES,
  dynamicSettings,
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
  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      size: 0,
      query: {
        ...filters,
      },
      aggs,
    },
  };

  const { aggregations } = await callES('search', params);
  return extractFilterAggsResults(aggregations, ['tags', 'locations', 'ports', 'schemes']);
};
