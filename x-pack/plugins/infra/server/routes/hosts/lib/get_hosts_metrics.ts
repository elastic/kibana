/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';
import { BUCKET_KEY, METADATA_AGGREGATION } from './constants';
import { GetHostsArgs, HostsMetricsSearchAggregationResponseRT } from './types';
import { createQueryFormulas } from './metric_aggregation_formulas';
import { createFilters, getOrder, runQuery } from './helpers/query';

export const getHostMetrics = async (
  { searchClient, source, params }: GetHostsArgs,
  filteredHostNames: string[] = [],
  sortedHostNames: string[] = []
) => {
  const query = createQuery(params, source, filteredHostNames, sortedHostNames);
  return lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(HostsMetricsSearchAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  source: InfraSource,
  filteredHostNames: string[],
  sortedHostNames: string[]
): ESSearchRequest => {
  const { runtimeFields, metricAggregations } = createQueryFormulas(
    params.metrics.map((metric) => metric.type)
  );

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: source.configuration.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          filter: createFilters({
            params,
            filteredHostNames: [...new Set([...filteredHostNames, ...sortedHostNames])],
          }),
        },
      },
      runtime_mappings: runtimeFields,
      aggs: {
        ...createAggregations(params, metricAggregations, filteredHostNames, sortedHostNames),
      },
    },
  };
};

const createAggregations = (
  params: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>,
  filteredHostNames: string[],
  sortedHostNames: string[]
) => {
  const hasSortedAggregation = sortedHostNames.length > 0;
  const hasDefaultAggregation = sortedHostNames.length < params.limit;
  return {
    ...(hasSortedAggregation
      ? createBucketSortedBySubAggregation(params, metricAggregations, sortedHostNames)
      : {}),
    ...(hasDefaultAggregation
      ? createDefautSortBucket(params, metricAggregations, filteredHostNames, sortedHostNames)
      : {}),
  };
};

const createAggregationFilter = (sortedHostNames: string[]): estypes.QueryDslQueryContainer => {
  return sortedHostNames
    ? {
        terms: {
          [BUCKET_KEY]: sortedHostNames,
        },
      }
    : {};
};

const createBucketSortedBySubAggregation = (
  params: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>,
  sortedHostNames: string[]
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    sortedByMetric: {
      filter: {
        bool: {
          filter: sortedHostNames.length > 0 ? [createAggregationFilter(sortedHostNames)] : [],
        },
      },
      aggs: {
        hosts: {
          terms: {
            field: BUCKET_KEY,
            order: getOrder(params),
            size: sortedHostNames.length,
          },
          aggs: {
            ...metricAggregations,
            ...METADATA_AGGREGATION,
          },
        },
      },
    },
  };
};

const createDefautSortBucket = (
  params: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>,
  filteredHostNames: string[],
  sortedHostNames: string[]
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    sortedByTerm: {
      filter: {
        bool: {
          must_not:
            sortedHostNames.length > 0
              ? {
                  ...createAggregationFilter(sortedHostNames),
                }
              : [],
        },
      },
      aggs: {
        hosts: {
          terms: {
            field: BUCKET_KEY,
            order: {
              _key: params.sortDirection ?? 'asc',
            },
            size: filteredHostNames.length > 0 ? filteredHostNames.length : params.limit,
          },
          aggs: {
            ...metricAggregations,
            ...METADATA_AGGREGATION,
          },
        },
      },
    },
  };
};
