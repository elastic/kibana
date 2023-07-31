/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { IEsSearchRequest } from '@kbn/data-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { buildAggregationSearchRequest } from '../utils/build_requests';
import type { RawAggregatedDataResponse } from '../utils/fetch_data';
import { AGG_KEY, createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../common/lib/kibana';

const QUERY_KEY = 'useFetchFieldValuePairWithAggregation';
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

export interface UseFetchFieldValuePairWithAggregationParams {
  /**
   * The highlighted field name and values
   * */
  highlightedField: { name: string; values: string[] };
  /**
   * Field to aggregate value by
   */
  aggregationField: string;
}

export interface UseFetchFieldValuePairWithAggregationResult {
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
 * Hook to retrieve all the unique documents for the aggregationField in the environment that have the field/value pair, using ReactQuery.
 *
 * Foe example, passing 'host.name' via the aggregationField props will return the number of unique hosts in the environment that have the field/value pair.
 */
export const useFetchFieldValuePairWithAggregation = ({
  highlightedField,
  aggregationField,
}: UseFetchFieldValuePairWithAggregationParams): UseFetchFieldValuePairWithAggregationResult => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const { from, to } = { from: DEFAULT_FROM, to: DEFAULT_TO };
  const { name, values } = highlightedField;

  const searchRequest = buildSearchRequest(name, values, from, to, aggregationField);

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, name, values, from, to, aggregationField],
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

/**
 * Build the search request for the field/values pair, for a date range from/to.
 * The request contains aggregation by aggregationField.
 */
const buildSearchRequest = (
  field: string,
  values: string[],
  from: string,
  to: string,
  aggregationField: string
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
  return buildAggregationSearchRequest(aggregationField, AGG_KEY, query);
};
