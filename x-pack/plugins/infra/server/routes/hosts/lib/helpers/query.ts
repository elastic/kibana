/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient } from '@kbn/data-plugin/common';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESSearchRequest } from '@kbn/es-types';
import { catchError, map, Observable } from 'rxjs';
import { GetHostsRequestBodyPayload } from '../../../../../common/http_api/hosts';
import { getSortField } from '../utils';

export const getOrder = (params: GetHostsRequestBodyPayload) => {
  return {
    [getSortField(params.sortField)]: params.sortDirection ?? 'asc',
  };
};

export const createFilters = ({
  params,
  extraFilter,
  filteredHostNames = [],
}: {
  params: GetHostsRequestBodyPayload;
  filteredHostNames?: string[];
  extraFilter?: QueryDslQueryContainer;
}) => {
  const extrafilterClause = extraFilter?.bool?.filter;
  const extraFilterArray = !!extrafilterClause
    ? Array.isArray(extrafilterClause)
      ? extrafilterClause
      : [extrafilterClause]
    : [];

  const hostNamesFilter =
    filteredHostNames.length > 0
      ? [
          {
            terms: {
              'host.name': filteredHostNames,
            },
          },
        ]
      : [];

  return [
    ...hostNamesFilter,
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
    {
      term: {
        'event.module': 'system',
      },
    },
    ...extraFilterArray,
  ];
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
