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
import type { DataView } from '@kbn/data-views-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import {
  NUMERIC_TYPE_LABEL,
  CATEGORICAL_TYPE_LABEL,
  REFERENCE_LABEL,
  PRODUCTION_LABEL,
  DRIFT_P_VALUE_THRESHOLD,
  CRITICAL_VALUES_TABLE,
  SIGNIFICANCE_LEVELS,
} from './constants';

import {
  Histogram,
  NumericDriftData,
  CategoricalDriftData,
  Range,
  FETCH_STATUS,
  Result,
  isNumericDriftData,
  Feature,
  DataDriftField,
  TimeRange,
} from './types';

export const getDataDriftType = (kibanaType: string): 'numeric' | 'categoric' | 'unsupported' => {
  switch (kibanaType) {
    case 'number':
      return 'numeric';
    case 'boolean':
    case 'string':
      return 'categoric';
    default:
      return 'unsupported';
  }
};

const criticalTableLookup = (chi2Statistic: number, df: number) => {
  // Get the row index
  const rowIndex: number = df - 1;

  // Get the column index
  let minDiff: number = Math.abs(CRITICAL_VALUES_TABLE[rowIndex][0] - chi2Statistic);
  let columnIndex: number = 0;
  for (let j = 1; j < CRITICAL_VALUES_TABLE[rowIndex].length; j++) {
    const diff: number = Math.abs(CRITICAL_VALUES_TABLE[rowIndex][j] - chi2Statistic);
    if (diff < minDiff) {
      minDiff = diff;
      columnIndex = j;
    }
  }

  const significanceLevel: number = SIGNIFICANCE_LEVELS[columnIndex];
  return significanceLevel;
};

export const computeChi2PValue = (
  normalizedBaselineTerms: Histogram[],
  normalizedDriftedTerms: Histogram[]
) => {
  // Get all unique keys from both arrays
  const allKeys: string[] = Array.from(
    new Set([
      ...normalizedBaselineTerms.map((term) => term.key.toString()),
      ...normalizedDriftedTerms.map((term) => term.key.toString()),
    ])
  ).sort();

  // // Calculate the expected and observed frequencies for each key
  // const frequencies: { [key: string]: { observed: number; expected: number } } = {};
  // // let totalBaseline: number = 0;
  // // let totalDrifted: number = 0;
  // allKeys.forEach((key) => {
  //   const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
  //   const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

  //   const observedBaseline: number = baselineTerm ? baselineTerm.doc_count : 0;
  //   const observedDrifted: number = driftedTerm ? driftedTerm.doc_count : 0;
  //   frequencies[key] = {
  //     observed: observedDrifted,
  //     expected: observedBaseline,
  //   };

  //   // totalBaseline += observedBaseline;
  //   // totalDrifted += observedDrifted;
  // });

  // Calculate the chi-squared statistic and degrees of freedom
  let chiSquared: number = 0;
  const degreesOfFreedom: number = allKeys.length - 1;
  allKeys.forEach((key) => {
    const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
    const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

    const observed: number = driftedTerm ? driftedTerm.percentage : 0;
    const expected: number = baselineTerm ? baselineTerm.percentage : 0;
    chiSquared += Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero
  });

  return criticalTableLookup(chiSquared, degreesOfFreedom);
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

const normalizeHistogram = (histogram: Histogram[]): Histogram[] => {
  // Compute a total doc_count for all terms
  const totalDocCount: number = histogram.reduce((acc, term) => acc + term.doc_count, 0);
  // Iterate over the original array and update the doc_count of each term in the new array
  return histogram.map((term) => ({ ...term, percentage: term.doc_count / totalDocCount }));
};

const normalizeTerms = (
  terms: Histogram[],
  keys: Array<{ key: string; relative_drift: number }>,
  totalDocCount: number
): { normalizedTerms: Histogram[]; totalDocCount: number } => {
  // Create a new array of terms with the same keys as the given array
  const normalizedTerms: Array<Histogram & { relative_drift?: number }> = keys.map((term) => ({
    ...term,
    doc_count: 0,
  }));

  // Iterate over the original array and update the doc_count of each term in the new array
  terms.forEach((term) => {
    const index: number = keys.findIndex((k) => k.key === term.key.toString());
    if (index !== -1) {
      normalizedTerms[index].doc_count = term.doc_count;
      normalizedTerms[index].percentage = term.doc_count / totalDocCount;
    }
  });

  return {
    normalizedTerms,
    totalDocCount,
  };
};

const processDataDriftResult = (
  result: Record<string, NumericDriftData | CategoricalDriftData>
): Feature[] => {
  const d = Object.entries(result).map(([featureName, data], idx) => {
    if (isNumericDriftData(data)) {
      // normalize data.referenceHistogram and data.productionHistogram to use frequencies instead of counts
      const referenceHistogram: Histogram[] = normalizeHistogram(data.referenceHistogram);
      const productionHistogram: Histogram[] = normalizeHistogram(data.productionHistogram);

      return {
        featureName,
        featureType: NUMERIC_TYPE_LABEL,
        driftDetected: data.pValue < DRIFT_P_VALUE_THRESHOLD,
        similarityTestPValue: data.pValue,
        referenceHistogram: referenceHistogram ?? [],
        productionHistogram: productionHistogram ?? [],
        comparisonDistribution: [
          ...referenceHistogram.map((h) => ({ ...h, g: REFERENCE_LABEL })),
          ...productionHistogram.map((h) => ({ ...h, g: PRODUCTION_LABEL })),
        ],
      };
    }

    // normalize data.baselineTerms and data.driftedTerms to have same keys
    // Get all unique keys from both arrays
    const allKeys: string[] = Array.from(
      new Set([
        ...data.baselineTerms.map((term) => term.key.toString()),
        ...data.driftedTerms.map((term) => term.key.toString()),
      ])
    );

    // Compute a total doc_count for all terms
    const referenceTotalDocCount: number = data.baselineTerms.reduce(
      (acc, term) => acc + term.doc_count,
      data.baselineSumOtherDocCount
    );
    const productionTotalDocCount: number = data.driftedTerms.reduce(
      (acc, term) => acc + term.doc_count,
      data.driftedSumOtherDocCount
    );

    // Sort the categories (allKeys) by the following metric: Math.abs(productionDocCount-referenceDocCount)/referenceDocCount
    const sortedKeys = allKeys
      .map((k) => {
        const key = k.toString();
        const baselineTerm = data.baselineTerms.find((t) => t.key === key);
        const driftedTerm = data.driftedTerms.find((t) => t.key === key);
        if (baselineTerm && driftedTerm) {
          const referencePercentage = baselineTerm.doc_count / referenceTotalDocCount;
          const productionPercentage = driftedTerm.doc_count / productionTotalDocCount;
          return {
            key,
            relative_drift:
              Math.abs(productionPercentage - referencePercentage) / referencePercentage,
          };
        }
        return {
          key,
          relative_drift: Infinity,
        };
      })
      .sort((s1, s2) => s2.relative_drift - s1.relative_drift);

    // Normalize the baseline and drifted terms arrays
    const { normalizedTerms: normalizedBaselineTerms } = normalizeTerms(
      data.baselineTerms,
      sortedKeys,
      referenceTotalDocCount
    );
    const { normalizedTerms: normalizedDriftedTerms } = normalizeTerms(
      data.driftedTerms,
      sortedKeys,
      productionTotalDocCount
    );

    const pValue: number = computeChi2PValue(normalizedBaselineTerms, normalizedDriftedTerms);
    return {
      featureName,
      featureType: CATEGORICAL_TYPE_LABEL,
      driftDetected: pValue < DRIFT_P_VALUE_THRESHOLD,
      similarityTestPValue: pValue,
      referenceHistogram: normalizedBaselineTerms ?? [],
      productionHistogram: normalizedDriftedTerms ?? [],
      comparisonDistribution: [
        ...normalizedBaselineTerms.map((h) => ({ ...h, g: REFERENCE_LABEL })),
        ...normalizedDriftedTerms.map((h) => ({ ...h, g: PRODUCTION_LABEL })),
      ],
    };
  });
  return d;
};
export const useFetchDataDriftResult = ({
  fields,
  referenceDataView,
  productionDataView,
  timeRanges,
}: {
  fields?: DataDriftField[];
  referenceDataView?: DataView;
  productionDataView?: DataView;
  timeRanges?: { reference: TimeRange; production: TimeRange };
} = {}) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<Result<Feature[]>>({
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

      if (!fields || !referenceDataView || !productionDataView) return;

      setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

      const referenceIndex = referenceDataView?.getIndexPattern();
      const productionIndex = productionDataView?.getIndexPattern();

      const referenceDatetimeField = referenceDataView?.timeFieldName;
      const productionDatetimeField = productionDataView?.timeFieldName;

      let refRangeFilter;
      if (referenceDatetimeField !== undefined && timeRanges?.reference) {
        refRangeFilter = {
          range: {
            [referenceDatetimeField]: {
              gte: timeRanges?.reference.start,
              lte: timeRanges.reference.end,
            },
          },
        };
      }

      try {
        const baselineRequest = {
          index: referenceIndex,
          body: {
            size: 0,
            ...(refRangeFilter ? { query: { bool: { filter: [refRangeFilter] } } } : {}),
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };

        console.log(`--@@baselineRequest`, baselineRequest);

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

        let prodRangeFilter;
        if (productionDatetimeField !== undefined && timeRanges?.production) {
          prodRangeFilter = {
            range: {
              [productionDatetimeField]: {
                gte: timeRanges?.production.start,
                lte: timeRanges.production.end,
              },
            },
          };
        }

        const driftedRequest = {
          index: productionIndex,
          body: {
            size: 0,
            ...(prodRangeFilter ? { query: { bool: { filter: [prodRangeFilter] } } } : {}),
            aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
          },
        };

        console.log(`--@@driftedRequest`, driftedRequest);

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

        setResult({
          data: processDataDriftResult(data),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataSearch,
    JSON.stringify(fields, timeRanges),
    referenceDataView?.id,
    productionDataView?.id,
  ]);
  return result;
};
