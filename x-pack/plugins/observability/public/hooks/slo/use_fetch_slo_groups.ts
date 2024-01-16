/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isRunningResponse,
} from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/slo/constants';
import { sloKeys } from './query_key_factory';

interface Aggregation {
  doc_count: number;
  key: string;
}

interface GroupAggregationsResponse {
  aggregations: {
    groupByTags: {
      buckets: Aggregation[];
    };
  };
}

const createFetchAggregations = async (searchService: ISearchStart) => {
  const search = async <TResponse>(): Promise<TResponse> => {
    return new Promise((resolve, reject) => {
      searchService
        .search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>({
          params: {
            index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
            body: {
              size: 0,
              aggs: {
                groupByTags: {
                  terms: {
                    field: 'slo.tags',
                  },
                },
              },
            },
          },
        })
        .subscribe({
          next: (response) => {
            if (!isRunningResponse(response)) {
              resolve(response.rawResponse);
            }
          },
          error: (requestError) => {
            searchService.showError(requestError);
            reject(requestError);
          },
        });
    });
  };
  const { aggregations } = await search<GroupAggregationsResponse>();
  return aggregations;
};

export function useFetchSloGroups() {
  const {
    data: { search: searchService },
  } = useKibana().services;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: sloKeys.groups(),
    queryFn: async () => {
      const response = await createFetchAggregations(searchService);
      return response.groupByTags.buckets.reduce((acc, bucket) => {
        return { ...acc, [bucket.key]: bucket.doc_count ?? 0 };
      }, {} as Record<string, number>);
    },
  });

  return {
    data: data || {},
    isLoading,
    isFetching,
  };
}
