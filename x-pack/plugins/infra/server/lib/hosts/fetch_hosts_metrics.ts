/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient, ISearchOptionsSerializable } from '@kbn/data-plugin/common';
import { catchError, map, Observable } from 'rxjs';
import {
  GetHostsRequestParams,
  GetHostsResponsePayload,
  HostMetricType,
} from '../../../common/http_api/hosts';
import { InfraSource } from '../sources';
import { metricsAggregations } from './metrics_aggregations';
import { mapToApiResponse } from './map_to_response';
import { METADATA_FIELD, SORTFIELD_BY_AGGREGATION } from './constants';

const METADATA_AGGREGATION = {
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
} as const;

const createFormulas = (metricTypes: HostMetricType[]) => {
  return metricTypes.reduce(
    (acc, curr) => ({
      ...acc,
      runtimeFields: {
        ...acc.runtimeFields,
        ...(metricsAggregations[curr].runtimeField ?? {}),
      },
      aggregationFormulas: { ...acc.aggregationFormulas, ...metricsAggregations[curr].aggregation },
    }),
    {} as {
      runtimeFields: estypes.MappingRuntimeField;
      aggregationFormulas: estypes.AggregationsAggregate;
    }
  );
};

const getOrder = (params: GetHostsRequestParams) => {
  const sortByField = params?.sortField && SORTFIELD_BY_AGGREGATION[params?.sortField];
  return {
    [sortByField ? sortByField : params?.sortField ?? 'diskLatency>result']:
      params?.sortDirection ?? 'desc',
  };
};

const createAggregations = (
  params: GetHostsRequestParams,
  aggregationFormulas: estypes.AggregationsAggregate
) => {
  return {
    groupings: {
      terms: {
        field: 'host.name',
        order: getOrder(params),
        size: 100,
      },
      aggs: { ...aggregationFormulas, ...METADATA_AGGREGATION },
    },
  };
};
const createQueryParams = (params: GetHostsRequestParams, source: InfraSource) => {
  const { runtimeFields, aggregationFormulas } = createFormulas([
    'cpu',
    'diskLatency',
    'memory',
    'memoryTotal',
    'rx',
    'tx',
  ]);

  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: 'remote_cluster:metricbeat-*,metricbeat-*,remote_cluster:metrics-*,metrics-*',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-15m',
                  lte: 'now',
                },
              },
            },
          ],
        },
      },
      runtime_mappings: runtimeFields,
      aggs: { ...createAggregations(params, aggregationFormulas) },
    },
  };
};
export const fetchHostsMetrics = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string
): Observable<{ rawResponse: GetHostsResponsePayload | {} }> => {
  const queryParams = createQueryParams(params, source);
  const { executionContext: ctx, ...restOptions } = options || {};
  return serchClient
    .search<
      { id?: string; params: any },
      { rawResponse: estypes.SearchResponse<Record<string, unknown>> }
    >(
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
          ? mapToApiResponse(params, res.rawResponse.aggregations)
          : {},
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
