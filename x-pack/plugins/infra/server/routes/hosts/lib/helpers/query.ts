/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient } from '@kbn/data-plugin/common';
import { ESSearchRequest } from '@kbn/es-types';
import { catchError, map, Observable } from 'rxjs';
import { GetHostsRequestParams } from '../../../../../common/http_api/hosts';
import { RANDOM_SAMPLER_PROBABILITY } from '../constants';
import { getSortField } from '../utils';

export const getOrder = (params: GetHostsRequestParams) => {
  return {
    [getSortField(params.sortField)]: params.sortDirection ?? 'asc',
  };
};

export const createRandomSampler = (seed: number) => ({
  probability: RANDOM_SAMPLER_PROBABILITY,
  seed,
});

export const createFilters = (params: GetHostsRequestParams, filteredHostNames: string[] = []) => {
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
    {
      exists: {
        field: 'host.name',
      },
    },
  ];

  if (filteredHostNames.length > 0) {
    filter.push({
      terms: {
        'host.name': filteredHostNames,
      },
    });
  }

  return filter;
};

export const runQuery = <T>(
  serchClient: ISearchClient,
  queryRequest: ESSearchRequest,
  decoder: (aggregation: Record<string, estypes.AggregationsAggregate> | undefined) => T | undefined
): Observable<T | undefined> => {
  return serchClient
    .search({
      params: queryRequest,
    })
    .pipe(
      map((res) => decoder(res.rawResponse.aggregations)),
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
