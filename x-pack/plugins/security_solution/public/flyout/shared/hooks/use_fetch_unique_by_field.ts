/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type { RawAggregatedDataResponse } from '../utils/fetch_data';
import { AGG_KEY, createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../common/lib/kibana';
import { buildAggregationSearchRequest } from '../utils/build_requests';

const QUERY_KEY = 'useFetchUniqueByField';

export interface UseFetchUniqueByFieldParams {
  /**
   * Field to aggregate by
   */
  field: string;
}

export interface UseFetchUniqueByFieldValue {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Number of unique document by field found in the environment
   */
  count: number;
}

/**
 * Hook to retrieve all unique documents by field in the environment, using ReactQuery.
 *
 * For example, passing 'host.name' via the field props will return the number of unique hosts in the environment.
 */
export const useFetchUniqueByField = ({
  field,
}: UseFetchUniqueByFieldParams): UseFetchUniqueByFieldValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const searchRequest: IEsSearchRequest = buildAggregationSearchRequest(field, AGG_KEY);
  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, field],
    () => createFetchData<RawAggregatedDataResponse>(searchService, searchRequest),
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
