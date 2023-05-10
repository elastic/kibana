/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type {
  AggregationsBuckets,
  AggregationsMultiBucketAggregateBase,
  AggregationsPercentilesAggregateBase,
  SearchResponseBody,
} from '@elastic/elasticsearch/lib/api/types';
import { ExclusiveUnion } from '@elastic/eui';
import { useMlKibana } from '../contexts/kibana';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface Result<T extends unknown> {
  status: FETCH_STATUS;
  data?: T;
  error?: string;
}

export const useDataSearch = () => {
  const {
    services: { data },
  } = useMlKibana();

  return useCallback(
    async (esSearchRequestParams: IKibanaSearchRequest['params'], abortSignal?: AbortSignal) => {
      try {
        const { rawResponse: resp } = await lastValueFrom(
          data.search.search(
            {
              params: esSearchRequestParams,
            },
            { abortSignal }
          )
        );

        return resp;
      } catch (error) {
        if (error.name === 'AbortError') {
          // ignore abort errors
        } else {
          return error;
        }
      }
    },
    [data]
  );
};

const percents = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

export const useFetchDataDriftResult = (
  fields: Array<{ field: string; type: 'numeric' | 'categorical' }>
) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<
    Result<{ driftedPValue: number | undefined; buckets: AggregationsBuckets | undefined }>
  >({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
    error: undefined,
  });

  useEffect(() => {
    let controller: AbortController = new AbortController();

    const doFetchEsRequest = async function () {
      controller.abort();

      controller = new AbortController();

      const signal = controller.signal;

      setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

      // @TODO: Should refactor for array of input `fields`, not just hard coded `numeric_unchangeable`
      const referenceIndex = 'baseline';
      const productionIndex = 'drifted';
      try {
        const percentilesResp: SearchResponseBody<
          unknown,
          Record<string, AggregationsPercentilesAggregateBase>
        > = await dataSearch(
          {
            index: referenceIndex,
            body: {
              size: 0,
              aggs: {
                // @TODO: Should add more fields here
                numeric_unchangeable_percentiles: {
                  percentiles: {
                    field: 'numeric_unchangeable',
                    percents,
                  },
                },
              },
            },
          },
          signal
        );

        if (!percentilesResp.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch percentiles data from ${referenceIndex}`,
          });
          return;
        }
        const percentiles = Object.values(
          percentilesResp.aggregations.numeric_unchangeable_percentiles?.values
        );
        // Result is
        const ranges: Array<{ from?: number; to?: number }> = [];
        percentiles.forEach((val: number, idx) => {
          if (idx === 0) {
            ranges.push({ to: val });
          } else if (idx === percentiles.length - 1) {
            ranges.push({ from: val });
          } else {
            ranges.push({ from: percentiles[idx - 1], to: val });
          }
        });

        const driftedResp: SearchResponseBody<
          unknown,
          Record<
            string,
            ExclusiveUnion<{ two_sided: number }, AggregationsMultiBucketAggregateBase>
          >
        > = await dataSearch(
          {
            index: productionIndex,
            body: {
              size: 0,
              aggs: {
                numeric_unchangeable_ranges: {
                  range: {
                    field: 'numeric_unchangeable',
                    ranges,
                  },
                },
                _ks_test_: {
                  bucket_count_ks_test: {
                    buckets_path: 'numeric_unchangeable_ranges>_count',
                    alternative: 'two_sided',
                  },
                },
              },
            },
          },
          signal
        );

        if (!driftedResp.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch drift data from ${productionIndex}`,
          });
          return;
        }

        const data = {
          driftedPValue: driftedResp.aggregations._ks_test_.two_sided,
          buckets: driftedResp.aggregations.numeric_unchangeable_ranges.buckets,
        };
        setResult({
          data,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch (e) {
        setResult({
          data: undefined,
          status: FETCH_STATUS.FAILURE,
          error: extractErrorMessage(e),
        });
      }
    };

    doFetchEsRequest();

    return () => {
      controller.abort();
    };
  }, [dataSearch, fields]);
  return result;
};
