/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { ESSearchRequest } from '@kbn/es-types';
import { catchError, map, Observable } from 'rxjs';

import { decodeOrThrow } from '../../../../common/runtime_types';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { GetHostsRequestParams } from '../../../../common/http_api/hosts';
import {
  FilteredHostsAggregationResponse,
  FilteredHostsAggregationResponseRT,
  GetHostsArgs,
} from './types';
import { BUCKET_KEY, MAX_FILTERED_HOST_SIZE } from './constants';
import { parseFilters } from './utils';

type QueryResponse = IKibanaSearchResponse<FilteredHostsAggregationResponse | undefined>;

const createFilters = (params: GetHostsRequestParams): estypes.QueryDslQueryContainer => {
  const parsedFilters = parseFilters(params.query);

  return {
    bool: {
      ...parsedFilters.bool,
      filter: [
        ...(Array.isArray(parsedFilters.bool.filter) ? parsedFilters.bool.filter ?? [] : []),
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

const createQuery = (params: GetHostsRequestParams, source: InfraSource): ESSearchRequest => {
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

export const getFilteredHosts = ({
  searchClient,
  source,
  params,
  options,
  id,
}: GetHostsArgs): Observable<QueryResponse> => {
  const queryRequest = createQuery(params, source);
  const { executionContext: ctx, ...restOptions } = options || {};

  return searchClient
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
        rawResponse: decodeOrThrow(FilteredHostsAggregationResponseRT)(
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
