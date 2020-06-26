/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { generateFilterAggs } from './generate_filter_aggs';
import { OverviewFiltersByFieldName } from '../../../common/runtime_types/overview_filters/overview_filters';
import { FILTER_ALLOW_LIST } from '../../../common/constants';
import { FilterName } from '../../../common/types';

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

export const extractFilterAggsResults = (
  responseAggregations: Record<string, any>
): OverviewFiltersByFieldName => {
  const values: OverviewFiltersByFieldName = {
    'observer.geo.name': [],
    'url.port': [],
    'monitor.type': [],
    tags: [],
  };
  Object.keys(responseAggregations)
    .filter((key) => FILTER_ALLOW_LIST.some(({ name }) => name === key))
    .forEach((key) => {
      const buckets: Array<{ key: string & number }> =
        responseAggregations?.[key]?.term?.buckets ?? [];
      const fieldName: FilterName | undefined = FILTER_ALLOW_LIST.find(({ name }) => key === name)
        ?.fieldName;
      if (fieldName) {
        values[fieldName] = buckets.map(({ key: bucketKey }) => bucketKey);
      }
    });
  return values;
};

export const getFilterBar: UMElasticsearchQueryFn<
  GetFilterBarParams,
  OverviewFiltersByFieldName
> = async ({ callES, dynamicSettings, dateRangeStart, dateRangeEnd, search, filterOptions }) => {
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
  return extractFilterAggsResults(aggregations);
};
