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
import { ESSearchRequest } from '@kbn/es-types';
import { catchError, map, Observable } from 'rxjs';
import { decodeOrThrow } from '../../../common/runtime_types';
import { GetHostsRequestParams } from '../../../common/http_api/hosts';
import { parseFilterQuery } from '../../utils/serialized_query';
import { InfraSource } from '../sources';
import { FilteredHostsAggregationResponse, FilteredHostsAggregationResponseRT } from './types';
import { BUCKET_KEY, MAX_FILTERED_HOST_SIZE } from './constants';

const createFilters = (params: GetHostsRequestParams): estypes.QueryDslQueryContainer => {
  const parsedFilters = parseFilterQuery(params.query) as estypes.QueryDslQueryContainer;
  return {
    bool: {
      ...parsedFilters.bool,
      filter: [
        ...(Array.isArray(parsedFilters.bool?.filter) ? parsedFilters.bool?.filter ?? [] : []),
        {
          range: {
            '@timestamp': {
              gte: params.timeRange.from,
              lte: params.timeRange.to,
              format: 'epoch_millis',
            },
          },
        },
        {
          exists: {
            field: 'host.name',
          },
        },
      ],
    },
  };
};

const createQueryParams = (params: GetHostsRequestParams, source: InfraSource): ESSearchRequest => {
  return {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: source.configuration.metricAlias,
    body: {
      size: 0,
      query: {
        ...createFilters(params),
      },
      aggs: {
        sampling: {
          random_sampler: {
            probability: 0.1,
            seed: 42,
          },
          aggs: {
            hosts: {
              terms: {
                size: MAX_FILTERED_HOST_SIZE,
                field: BUCKET_KEY,
                order: {
                  _key: 'asc',
                },
              },
            },
          },
        } as any,
      },
    },
  };
};

export const getFilteredHosts = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string
): Observable<IKibanaSearchResponse<FilteredHostsAggregationResponse | null>> => {
  const queryParams = createQueryParams(params, source);
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
          ? decodeOrThrow(FilteredHostsAggregationResponseRT)(res.rawResponse.aggregations)
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
