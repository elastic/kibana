/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraStaticSourceConfiguration } from '../../../lib/sources';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestBodyPayload, HostMetricType } from '../../../../common/http_api/hosts';
import {
  BUCKET_KEY,
  FILTER_AGGREGATION_SUB_AGG_NAME,
  METADATA_AGGREGATION,
  SORT_BY_AGGREGATION_NAME,
} from './constants';
import { GetHostsArgs, HostsMetricsSearchAggregationResponseRT } from './types';
import { createQueryFormulas, metricsAggregationFormulas } from './metric_aggregation_formulas';
import { createFilters, runQuery } from './helpers/query';
import { hasSortByMetric } from './utils';

export const getTopHosts = async (
  { searchClient, sourceConfig, params }: GetHostsArgs,
  hostNamesShortList: string[] = []
) => {
  const query = createQuery(params, sourceConfig, hostNamesShortList);
  return lastValueFrom(
    runQuery(searchClient, query, decodeOrThrow(HostsMetricsSearchAggregationResponseRT))
  );
};

const createQuery = (
  params: GetHostsRequestBodyPayload,
  sourceConfig: InfraStaticSourceConfiguration,
  hostNamesShortList: string[]
): ESSearchRequest => {
  const { runtimeFields, metricAggregations } = createQueryFormulas(
    params.metrics.map((metric) => metric.type)
  );

  const size = hostNamesShortList.length > 0 ? hostNamesShortList.length : params.limit;

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfig.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          filter: createFilters({
            params,
            hostNamesShortList,
          }),
        },
      },
      runtime_mappings: runtimeFields,
      aggs: createAggregations(params, metricAggregations, size),
    },
  };
};

const createAggregations = (
  params: GetHostsRequestBodyPayload,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>,
  size: number
) => {
  const aggregationForSorting = hasSortByMetric(params) ? createAggregationForSorting(params) : {};
  return {
    hosts: {
      terms: {
        field: BUCKET_KEY,
        order: getOrder(params),
        size,
      },
      aggs: {
        ...metricAggregations,
        ...aggregationForSorting,
        ...METADATA_AGGREGATION,
      },
    },
  };
};

const createAggregationForSorting = (params: GetHostsRequestBodyPayload) => {
  if (!params.sortField) {
    throw new Error('sortField must be informed');
  }

  const { fieldName, aggregation } = metricsAggregationFormulas[params.sortField as HostMetricType];

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#_ordering_by_a_sub_aggregation
  // This may return wrong values. Ideally we would get the top hosts by the actual metric aggregation.
  // With terms aggregation, sorting by a sub metric aggregation of either max and min is safe, whereas by avg it is not.
  // Max and Min might not represent the actual order, but sorting by avg could return wrong values too.
  const aggType = params.sortDirection === 'asc' ? 'min' : 'max';
  return {
    [SORT_BY_AGGREGATION_NAME]: aggregation.filter
      ? {
          filter: aggregation.filter,
          aggs: {
            [FILTER_AGGREGATION_SUB_AGG_NAME]: {
              [aggType]: {
                field: fieldName,
              },
            },
          },
        }
      : {
          [aggType]: {
            field: fieldName,
          },
        },
  };
};

export const getOrder = (
  params: GetHostsRequestBodyPayload
): estypes.AggregationsAggregateOrder => {
  if (!params.sortField || params.sortField === 'name') {
    return {
      _key: params.sortDirection ?? 'asc',
    };
  }

  const { aggregation } = metricsAggregationFormulas[params.sortField as HostMetricType];
  const sortByFieldName = aggregation.filter
    ? `${SORT_BY_AGGREGATION_NAME}>${FILTER_AGGREGATION_SUB_AGG_NAME}`
    : SORT_BY_AGGREGATION_NAME;

  return {
    [sortByFieldName]: params.sortDirection ?? 'asc',
  };
};
