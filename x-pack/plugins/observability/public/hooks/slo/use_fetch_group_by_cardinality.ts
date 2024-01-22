/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../utils/kibana_react';

export interface UseFetchIndexPatternFieldsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: { cardinality: number; isHighCardinality: boolean };
}

const HIGH_CARDINALITY_THRESHOLD = 1000;

export function useFetchGroupByCardinality(
  indexPattern: string,
  timestampField: string,
  groupBy: string
): UseFetchIndexPatternFieldsResponse {
  const { data: dataService } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchGroupByCardinality', indexPattern, timestampField, groupBy],
    queryFn: async ({ signal }) => {
      try {
        const result = await lastValueFrom(
          dataService.search.search({
            params: {
              index: indexPattern,
              body: {
                query: {
                  bool: {
                    filter: [{ range: { [timestampField]: { gte: 'now-24h' } } }],
                  },
                },
                aggs: {
                  groupByCardinality: {
                    cardinality: {
                      field: groupBy,
                    },
                  },
                },
              },
            },
          })
        );

        // @ts-expect-error Property 'value' does not exist on type 'AggregationsAggregate'
        const cardinality = result.rawResponse?.aggregations?.groupByCardinality?.value ?? 0;
        return { cardinality, isHighCardinality: cardinality > HIGH_CARDINALITY_THRESHOLD };
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled:
      Boolean(indexPattern) && Boolean(timestampField) && Boolean(groupBy) && groupBy !== ALL_VALUE,
  });

  return { isLoading, isError, isSuccess, data };
}
