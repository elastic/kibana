/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptionsSerializable,
} from '@kbn/data-plugin/common';
import { catchError, lastValueFrom, map, Observable, of } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { decodeOrThrow } from '../../../../common/runtime_types';
import { GetHostsRequestParams } from '../../../../common/http_api/hosts';
import { BUCKET_KEY, METADATA_AGGREGATION } from './constants';
import {
  GetHostsMetricsArgs,
  HostsMetricsSearchAggregationResponse,
  HostsMetricsSearchAggregationResponseRT,
} from './types';
import { createQueryFormulas } from './metric_aggregation_formulas';
import { getSortField } from './utils';

type AggregationFunc = (
  params: GetHostsRequestParams,
  aggregationFormulas: Record<string, estypes.AggregationsAggregationContainer>
) => Record<string, estypes.AggregationsAggregationContainer>;

type QueryResponse = IKibanaSearchResponse<HostsMetricsSearchAggregationResponse | undefined>;

const createFilterOutNullAggregation = (
  field: string
): Record<string, estypes.AggregationsAggregationContainer> => ({
  filter_out_null: {
    bucket_selector: {
      buckets_path: {
        fieldValue: field,
      },
      script: 'params.fieldValue > 0',
    },
  },
});

const getOrder = (params: GetHostsRequestParams) => {
  return {
    [getSortField(params.sortField)]: params.sortDirection ?? 'asc',
  };
};

const createSortedAggregations = (
  params: GetHostsRequestParams,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    groupings: {
      terms: {
        field: BUCKET_KEY,
        order: getOrder(params),
        size: params.limit,
      },
      aggs: {
        ...metricAggregations,
        ...METADATA_AGGREGATION,
        ...createFilterOutNullAggregation(getSortField(params.sortField)),
      },
    },
  };
};

const createAggregations = (
  params: GetHostsRequestParams,
  metricAggregations: Record<string, estypes.AggregationsAggregationContainer>
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    groupings: {
      terms: {
        field: BUCKET_KEY,
        order: {
          _key: 'asc',
        },
        size: params.limit,
      },
      aggs: {
        ...metricAggregations,
        ...METADATA_AGGREGATION,
      },
    },
  };
};

const createFilters = (params: GetHostsRequestParams, filteredHostNames: string[] = []) => {
  const filter: estypes.QueryDslQueryContainer[] = [
    {
      range: {
        '@timestamp': {
          gte: params.timeRange.from,
          lte: params.timeRange.to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  if (filteredHostNames.length > 0) {
    filter.push({
      terms: {
        'host.name': filteredHostNames,
      },
    });
  } else {
    filter.push({
      exists: {
        field: 'host.name',
      },
    });
  }

  return filter;
};

const createQuery = (
  params: GetHostsRequestParams,
  source: InfraSource,
  aggregationFunc: AggregationFunc,
  filteredHostNames: string[] = []
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
          filter: createFilters(params, filteredHostNames),
        },
      },
      runtime_mappings: runtimeFields,
      aggs: {
        ...aggregationFunc(params, metricAggregations),
      },
    },
  };
};

export const runQuery = (
  serchClient: ISearchClient,
  queryRequest: ESSearchRequest,
  options?: ISearchOptionsSerializable,
  id?: string
): Observable<QueryResponse> => {
  const { executionContext: ctx, ...restOptions } = options || {};
  return serchClient
    .search(
      {
        id,
        params: queryRequest,
      },
      restOptions
    )
    .pipe(
      map((res) => ({
        ...res,
        rawResponse: decodeOrThrow(HostsMetricsSearchAggregationResponseRT)(
          res.rawResponse.aggregations
        ),
      })),
      catchError((err) => {
        const error = {
          message: err.message,
          statusCode: err.statusCode,
          attributes: err.errBody?.error,
        };

        throw error;
      })
    );
};
const getHostsUnsortedMetrics = ({
  searchClient,
  source,
  params,
  options,
  id,
  filteredHostNames,
}: GetHostsMetricsArgs) => {
  const query = createQuery(params, source, createAggregations, filteredHostNames);
  return runQuery(searchClient, query, options, id);
};

const getHostsSortedMetrics = ({
  searchClient,
  source,
  params,
  options,
  id,
  filteredHostNames,
}: GetHostsMetricsArgs) => {
  const query = createQuery(params, source, createSortedAggregations, filteredHostNames);
  return runQuery(searchClient, query, options, id);
};

export const getHostMetrics = async ({
  searchClient,
  source,
  params,
  options,
  id,
  filteredHostNames = [],
}: GetHostsMetricsArgs) => {
  const sortRequest =
    params.sortField && params.sortField !== 'name'
      ? getHostsSortedMetrics({
          searchClient,
          source,
          params,
          options,
          id,
          filteredHostNames,
        })
      : of(undefined);

  const fetchHostsList = [
    lastValueFrom(
      getHostsUnsortedMetrics({
        searchClient,
        source,
        params,
        options,
        id,
        filteredHostNames,
      })
    ),
    lastValueFrom(sortRequest),
  ];

  return Promise.all(fetchHostsList);
};
