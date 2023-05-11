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
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlKibana } from '../contexts/kibana';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

interface Histogram {
  doc_count: 0;
  key: string | number;
}

export interface Result<T extends unknown> {
  status: FETCH_STATUS;
  data?: T;
  error?: string;
}

interface Range {
  min: number;
  max: number;
  interval: number;
}

interface NumericDriftData {
  type: 'numeric';
  pValue: number;
  range: Range;
  referenceHistogram: Histogram[];
  productionHistogram: Histogram[];
}
interface CategoricalDriftData {
  type: 'categoric';
  driftedTerms: Histogram[];
  driftedSumOtherDocCount: number;
  baselineTerms: Histogram[];
  baselineSumOtherDocCount: number;
}

export const isNumericDriftData = (arg: any): arg is NumericDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === 'numeric';
};

export const isCategoricalDriftData = (arg: any): arg is CategoricalDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === 'categoric';
};

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
  fields: Array<{ field: string; type: 'numeric' | 'categoric' }>
) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<
    Result<Record<string, NumericDriftData | CategoricalDriftData>>
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
        const baselineRequest = {
          index: referenceIndex,
          body: {
            size: 0,
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };
        // for each field with type "numeric", add a percentiles agg to the request
        for (const { field, type } of fields) {
          // if the field is numeric, add a percentiles and stats aggregations to the request
          if (type === 'numeric') {
            baselineRequest.body.aggs[`${field}_percentiles`] = {
              percentiles: {
                field,
                percents,
              },
            };
            baselineRequest.body.aggs[`${field}_stats`] = {
              stats: {
                field,
              },
            };
          }
          // if the field is categorical, add a terms aggregation to the request
          if (type === 'categoric') {
            baselineRequest.body.aggs[`${field}_terms`] = {
              terms: {
                field,
                size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
              },
            };
          }
        }

        console.log(baselineRequest);

        const baselineResponse = await dataSearch(baselineRequest, signal);

        console.log(baselineResponse);

        if (!baselineResponse.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch percentiles data from ${referenceIndex}`,
          });
          return;
        }

        const driftedRequest = {
          index: productionIndex,
          body: {
            size: 0,
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };

        // retrieve p-values for each numeric field
        for (const { field, type } of fields) {
          if (type === 'numeric') {
            // create ranges based on percentiles
            const percentiles = Object.values<number>(
              baselineResponse.aggregations.numeric_unchangeable_percentiles?.values
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
            // add range and bucket_count_ks_test to the request
            driftedRequest.body.aggs[`${field}_ranges`] = {
              range: {
                field,
                ranges,
              },
            };
            driftedRequest.body.aggs[`${field}_ks_test`] = {
              bucket_count_ks_test: {
                buckets_path: `${field}_ranges>_count`,
                alternative: ['two_sided'],
              },
            };
            // add stats aggregation to the request
            driftedRequest.body.aggs[`${field}_stats`] = {
              stats: {
                field,
              },
            };
          }
          // if feature is categoric perform terms aggregation
          if (type === 'categoric') {
            driftedRequest.body.aggs[`${field}_terms`] = {
              terms: {
                field,
                size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
              },
            };
          }
        }

        console.log('Drifted request', driftedRequest);

        const driftedResp = await dataSearch(driftedRequest, signal);

        console.log('Drifted response', driftedResp);

        if (!driftedResp.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch drift data from ${productionIndex}`,
          });
          return;
        }

        const referenceHistogramRequest = {
          index: referenceIndex,
          body: {
            size: 0,
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };

        const productionHistogramRequest = {
          index: productionIndex,
          body: {
            size: 0,
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };

        const fieldRange: { [field: string]: Range } = {};

        for (const { field, type } of fields) {
          // add histogram aggregation with min and max from baseline
          if (type === 'numeric') {
            const numBins = 10;
            const min = Math.min(
              baselineResponse.aggregations[`${field}_stats`].min,
              driftedResp.aggregations[`${field}_stats`].min
            );
            const max = Math.max(
              baselineResponse.aggregations[`${field}_stats`].max,
              driftedResp.aggregations[`${field}_stats`].max
            );
            const interval = (max - min) / numBins;
            const offset = min;
            fieldRange[field] = { min, max, interval };
            referenceHistogramRequest.body.aggs[`${field}_histogram`] = {
              histogram: {
                field,
                interval,
                offset,
                extended_bounds: {
                  min,
                  max,
                },
              },
            };
            productionHistogramRequest.body.aggs[`${field}_histogram`] = {
              histogram: {
                field,
                interval,
                offset,
                extended_bounds: {
                  min,
                  max,
                },
              },
            };
          }
        }

        console.log('Reference histogram request', referenceHistogramRequest);
        console.log('Production histogram request', productionHistogramRequest);

        const productionHistogramResponse = await dataSearch(productionHistogramRequest, signal);

        console.log('Production histogram response', productionHistogramResponse);

        if (!productionHistogramResponse.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch histogram data from ${productionIndex}`,
          });
          return;
        }

        const referenceHistogramResponse = await dataSearch(referenceHistogramRequest, signal);

        console.log('Reference histogram response', referenceHistogramResponse);

        if (!referenceHistogramResponse.aggregations) {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: `Unable to fetch histogram data from ${referenceIndex}`,
          });
          return;
        }

        // retrieve aggregation results from driftedResp for different fields and add to data
        console.log('Populating data');
        const data: Record<string, NumericDriftData | CategoricalDriftData> = {};
        for (const { field, type } of fields) {
          if (type === 'numeric') {
            data[field] = {
              type: 'numeric',
              pValue: driftedResp.aggregations[`${field}_ks_test`].two_sided,
              range: fieldRange[field],
              referenceHistogram:
                referenceHistogramResponse.aggregations[`${field}_histogram`].buckets,
              productionHistogram:
                productionHistogramResponse.aggregations[`${field}_histogram`].buckets,
            };
          }
          if (type === 'categoric') {
            data[field] = {
              type: 'categoric',
              driftedTerms: driftedResp.aggregations[`${field}_terms`].buckets,
              driftedSumOtherDocCount:
                driftedResp.aggregations[`${field}_terms`].sum_other_doc_count,
              baselineTerms: baselineResponse.aggregations[`${field}_terms`].buckets,
              baselineSumOtherDocCount:
                baselineResponse.aggregations[`${field}_terms`].sum_other_doc_count,
            };
          }
        }

        console.log('Parsed data', data);

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
  }, [dataSearch, JSON.stringify(fields)]);
  return result;
};
