/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { useQuery } from '@tanstack/react-query';
import type { IEsSearchRequest } from '@kbn/data-common';
import { createFetchAggregatedData } from '../utils/fetch_aggregated_data';
import { useKibana } from '../../../common/lib/kibana';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../common/containers/use_global_time';

const AGG_KEY = 'hostsWithSameFieldValuePair';
const QUERY_KEY = 'useFetchUniqueHostsWithFieldPair';

interface RawAggregatedDataResponse {
  aggregations: {
    [AGG_KEY]: {
      buckets: unknown[];
    };
  };
}

export interface UseFetchUniqueHostWithFieldPairParams {
  /**
   * Highlighted field
   */
  field: string;
  /**
   * Highlighted field value
   */
  values: string[];
  /**
   *
   */
  isActiveTimelines: boolean;
}

export interface UseFetchUniqueHostWithFieldPairResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Number of unique hosts found for the field/value pair
   */
  count: number;
}

/**
 * Hook to retrieve all the unique hosts in the environment that have the field/value pair, using ReactQuery.
 * The query uses an aggregation by unique hosts.
 */
export const useFetchUniqueHostsWithFieldPair = ({
  field,
  values,
  isActiveTimelines,
}: UseFetchUniqueHostWithFieldPairParams): UseFetchUniqueHostWithFieldPairResult => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;

  const searchRequest = buildSearchRequest(field, values, from, to);

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, field, values],
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

/**
 * Build the search request for the field/values pair, for a date range from/to.
 * The request contains aggregation by host.name field.
 */
const buildSearchRequest = (
  field: string,
  values: string[],
  from: string,
  to: string
): IEsSearchRequest => {
  const query = buildEsQuery(
    undefined,
    [],
    [
      {
        query: {
          bool: {
            filter: [
              {
                match: {
                  [field]: values[0],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ],
          },
        },
        meta: {},
      },
    ]
  );

  return {
    params: {
      body: {
        query,
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
};
