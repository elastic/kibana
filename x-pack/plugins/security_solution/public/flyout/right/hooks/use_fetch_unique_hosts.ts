/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import { createFetchAggregatedData } from '../utils/fetch_aggregated_data';
import { useKibana } from '../../../common/lib/kibana';

const AGG_KEY = 'uniqueHosts';
const QUERY_KEY = 'useFetchUniqueHosts';

interface RawAggregatedDataResponse {
  aggregations: {
    [AGG_KEY]: {
      buckets: unknown[];
    };
  };
}

const searchRequest: IEsSearchRequest = {
  params: {
    body: {
      aggs: {
        [AGG_KEY]: {
          terms: {
            field: 'host.name',
            size: 1000,
          },
        },
      },
      size: 0,
    },
  },
};

export interface UseUniqueValuesValue {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Number of unique hosts found in the environment
   */
  count: number;
}

/**
 * Hook to retrieve all unique hosts in the environment, using ReactQuery.
 * The query uses an aggregation by unique hosts.
 */
export const useFetchUniqueHosts = (): UseUniqueValuesValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY],
    () =>
      createFetchAggregatedData<RawAggregatedDataResponse>(searchService, searchRequest, AGG_KEY),
    {
      select: (res) => res.aggregations[AGG_KEY].buckets.length,
      keepPreviousData: true,
    }
  );

  return {
    loading: isLoading,
    error: isError,
    count: data || 0,
  };
};
