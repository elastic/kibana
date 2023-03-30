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
import { catchError, map, Observable } from 'rxjs';
import { ESSearchRequest } from '@kbn/es-types';
import { decodeOrThrow } from '../../../common/runtime_types';
import { GetHostsRequestParams, HostMetricType } from '../../../common/http_api/hosts';
import { InfraSource } from '../sources';
import { metricsAggregationFormulas } from './metric_aggregation_formulas';
import { BUCKET_KEY, METADATA_FIELD, SORTFIELD_BY_AGGREGATION } from './constants';
import {
  HostsMetricsSearchAggregationResponse,
  HostsMetricsSearchAggregationResponseRT,
} from './types';

const METADATA_AGGREGATION: Record<string, estypes.AggregationsAggregationContainer> = {
  [METADATA_FIELD]: {
    top_metrics: {
      metrics: [
        {
          field: 'host.os.name',
        },
        {
          field: 'cloud.provider',
        },
      ],
      size: 1,
      sort: {
        '@timestamp': 'desc',
      },
    },
  },
};

const getSortField = (params: GetHostsRequestParams) => {
  const sortBy =
    params.sortField && (SORTFIELD_BY_AGGREGATION[params.sortField] ?? params.sortField);
  if (!sortBy) {
    throw new Error('Invalid sortField');
  }

  return sortBy;
};

const createBucketSelectorAggregation = (
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

const createFormulas = (metricTypes: HostMetricType[]) => {
  return metricTypes.reduce(
    (acc, curr) => ({
      ...acc,
      runtimeFields: {
        ...acc.runtimeFields,
        ...(metricsAggregationFormulas[curr].runtimeField ?? {}),
      },
      aggregationFormulas: {
        ...acc.aggregationFormulas,
        ...metricsAggregationFormulas[curr].aggregation,
      },
    }),
    {} as {
      runtimeFields: estypes.MappingRuntimeFields;
      aggregationFormulas: Record<string, estypes.AggregationsAggregationContainer>;
    }
  );
};

const getOrder = (params: GetHostsRequestParams) => {
  return {
    [getSortField(params)]: params?.sortDirection ?? 'asc',
  };
};

const createSortedAggregations = (
  params: GetHostsRequestParams,
  aggregationFormulas: Record<string, estypes.AggregationsAggregationContainer>
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    groupings: {
      terms: {
        field: BUCKET_KEY,
        order: getOrder(params),
        size: params.limit,
      },
      aggs: {
        ...aggregationFormulas,
        ...METADATA_AGGREGATION,
        ...createBucketSelectorAggregation(getSortField(params)),
      },
    },
  };
};

const createAggregations = (
  params: GetHostsRequestParams,
  aggregationFormulas: Record<string, estypes.AggregationsAggregationContainer>
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
        ...aggregationFormulas,
        ...METADATA_AGGREGATION,
      },
    },
  };
};

const createQueryParams = (
  params: GetHostsRequestParams,
  source: InfraSource,
  aggregationFunc: typeof createAggregations,
  filteredHostNames: string[] = []
): ESSearchRequest => {
  const { runtimeFields, aggregationFormulas } = createFormulas(
    params.metrics.map((metric) => metric.type)
  );

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

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: source.configuration.metricAlias,
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      runtime_mappings: runtimeFields,
      aggs: {
        ...aggregationFunc(params, aggregationFormulas),
      },
    },
  };
};

export const runQuery = (
  serchClient: ISearchClient,
  queryParams: ESSearchRequest,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string
): Observable<IKibanaSearchResponse<HostsMetricsSearchAggregationResponse | null>> => {
  const { executionContext: ctx, ...restOptions } = options || {};
  return serchClient
    .search<{ id?: string; params: any }, IKibanaSearchResponse<estypes.SearchResponse>>(
      {
        id,
        params: queryParams,
      },
      restOptions
    )
    .pipe(
      map((res) => ({
        ...res,
        rawResponse: res.rawResponse.aggregations
          ? decodeOrThrow(HostsMetricsSearchAggregationResponseRT)(res.rawResponse.aggregations)
          : null,
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
export const getHostsMetrics = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string,
  filteredHostNames?: string[]
) => {
  const queryParams = createQueryParams(params, source, createAggregations, filteredHostNames);
  return runQuery(serchClient, queryParams, params, options, id);
};

export const getHostsSortedMetrics = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string,
  filteredHostNames?: string[]
) => {
  const queryParams = createQueryParams(
    params,
    source,
    createSortedAggregations,
    filteredHostNames
  );
  return runQuery(serchClient, queryParams, params, options, id);
};
