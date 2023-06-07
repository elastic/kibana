/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Query } from '@kbn/data-plugin/common';
import { merge } from 'lodash';
import { cloneDeep } from 'lodash';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getDefaultQuery, SearchQueryLanguage } from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import {
  REFERENCE_LABEL,
  PRODUCTION_LABEL,
  DRIFT_P_VALUE_THRESHOLD,
  CRITICAL_VALUES_TABLE,
  SIGNIFICANCE_LEVELS,
  DATA_DRIFT_TYPE,
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

export const getDataDriftType = (kibanaType: string): DataDriftField['type'] => {
  switch (kibanaType) {
    case 'number':
      return DATA_DRIFT_TYPE.NUMERIC;
    case 'boolean':
    case 'string':
      return DATA_DRIFT_TYPE.CATEGORICAL;
    default:
      return DATA_DRIFT_TYPE.UNSUPPORTED;
  }
};

// @TODO Write tests
const criticalTableLookup = (chi2Statistic: number, df: number) => {
  if (df < 1) return 1;
  if (!Number.isInteger(df)) throw Error('Degrees of freedom must be a valid integer');

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

// @TODO Write tests
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
  ).slice(0, 100);

  // Calculate the chi-squared statistic and degrees of freedom
  let chiSquared: number = 0;
  const degreesOfFreedom: number = allKeys.length - 1;

  if (degreesOfFreedom === 0) return 1;

  allKeys.forEach((key) => {
    const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
    const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

    const observed: number = driftedTerm?.percentage ?? 0;
    const expected: number = baselineTerm?.percentage ?? 0;
    chiSquared += Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero
  });

  return criticalTableLookup(chiSquared, degreesOfFreedom);
};

export const useDataSearch = () => {
  const { data } = useAiopsAppContext();

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
  return histogram.map((term) => ({
    ...term,
    percentage: totalDocCount > 0 ? term.doc_count / totalDocCount : 0,
  }));
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
    percentage: 0,
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
  return Object.entries(result).map(([featureName, data]) => {
    if (isNumericDriftData(data)) {
      // normalize data.referenceHistogram and data.productionHistogram to use frequencies instead of counts
      const referenceHistogram: Histogram[] = normalizeHistogram(data.referenceHistogram);
      const productionHistogram: Histogram[] = normalizeHistogram(data.productionHistogram);

      return {
        featureName,
        fieldType: DATA_DRIFT_TYPE.NUMERIC,
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
          relative_drift: 0,
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
      fieldType: DATA_DRIFT_TYPE.CATEGORICAL,
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
};

const getDataDriftQuery = ({
  runtimeFields,
  searchQuery,
  datetimeField,
  timeRange,
}: {
  runtimeFields: MappingRuntimeFields;
  searchQuery?: Query['query'];
  datetimeField?: string;
  timeRange?: TimeRange;
}) => {
  let rangeFilter;
  if (timeRange && datetimeField !== undefined && isPopulatedObject(timeRange, ['start', 'end'])) {
    rangeFilter = {
      range: {
        [datetimeField]: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    };
  }
  const query = cloneDeep(searchQuery ?? getDefaultQuery());

  if (isPopulatedObject(query, ['match_all'])) {
    delete query.match_all;
  }
  const refDataQuery: { query: Query['query']; runtime_mappings?: MappingRuntimeFields } =
    rangeFilter ? { query: merge({}, query, { bool: { filter: [rangeFilter] } }) } : { query };

  if (runtimeFields) {
    refDataQuery.runtime_mappings = runtimeFields;
  }
  return refDataQuery;
};

export const useFetchDataDriftResult = ({
  fields,
  currentDataView,
  timeRanges,
  searchQuery,
  searchString,
}: {
  fields?: DataDriftField[];
  currentDataView?: DataView;
  timeRanges?: { reference: TimeRange; production: TimeRange };
  searchQuery?: Query['query'];
  searchString?: Query['query'];
  searchQueryLanguage?: SearchQueryLanguage;
} = {}) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<Result<Feature[]>>({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
    error: undefined,
  });
  const [loaded, setLoaded] = useState<number>(0);

  useEffect(
    () => {
      let controller: AbortController = new AbortController();

      const doFetchEsRequest = async function () {
        controller.abort();

        setLoaded(0);
        setResult({ data: undefined, status: FETCH_STATUS.NOT_INITIATED, error: undefined });

        controller = new AbortController();

        const signal = controller.signal;

        if (!fields || !currentDataView) return;

        setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

        // Place holder for when there might be difference data views in the future
        const referenceIndex = currentDataView?.getIndexPattern();
        const productionIndex = referenceIndex;

        const runtimeFields = currentDataView?.getRuntimeMappings();

        const refDataQuery = getDataDriftQuery({
          searchQuery,
          datetimeField: currentDataView?.timeFieldName,
          runtimeFields,
          timeRange: timeRanges?.reference,
        });

        try {
          const baselineRequest = {
            index: referenceIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...refDataQuery,
            },
          };

          // for each field with type "numeric", add a percentiles agg to the request
          for (const { field, type } of fields) {
            // if the field is numeric, add a percentiles and stats aggregations to the request
            if (type === DATA_DRIFT_TYPE.NUMERIC) {
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
            if (type === DATA_DRIFT_TYPE.CATEGORICAL) {
              baselineRequest.body.aggs[`${field}_terms`] = {
                terms: {
                  field,
                  size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
                },
              };
            }
          }

          const baselineResponse = await dataSearch(baselineRequest, signal);

          setLoaded(0.25);

          if (!baselineResponse?.aggregations) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: `Unable to fetch percentiles data from ${referenceIndex}`,
            });
            return;
          }

          const prodDataQuery = getDataDriftQuery({
            searchQuery,
            datetimeField: currentDataView?.timeFieldName,
            runtimeFields,
            timeRange: timeRanges?.production,
          });

          const driftedRequest = {
            index: productionIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...prodDataQuery,
            },
          };

          // retrieve p-values for each numeric field
          for (const { field, type } of fields) {
            if (
              isPopulatedObject(baselineResponse?.aggregations, [`${field}_percentiles`]) &&
              type === DATA_DRIFT_TYPE.NUMERIC
            ) {
              // create ranges based on percentiles
              const percentiles = Object.values<number>(
                baselineResponse.aggregations[`${field}_percentiles`].values
              );
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
            if (type === DATA_DRIFT_TYPE.CATEGORICAL) {
              driftedRequest.body.aggs[`${field}_terms`] = {
                terms: {
                  field,
                  size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
                },
              };
            }
          }

          const driftedResp = await dataSearch(driftedRequest, signal);
          setLoaded(0.5);

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
              ...refDataQuery,
            },
          };

          const productionHistogramRequest = {
            index: productionIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...prodDataQuery,
            },
          };

          const fieldRange: { [field: string]: Range } = {};

          for (const { field, type } of fields) {
            // add histogram aggregation with min and max from baseline
            if (type === DATA_DRIFT_TYPE.NUMERIC) {
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

              if (interval === 0) {
                continue;
              }
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

          const [productionHistogramResponse, referenceHistogramResponse] = await Promise.all([
            dataSearch(productionHistogramRequest, signal),
            dataSearch(referenceHistogramRequest, signal),
          ]);

          const data: Record<string, NumericDriftData | CategoricalDriftData> = {};
          for (const { field, type } of fields) {
            if (type === DATA_DRIFT_TYPE.NUMERIC) {
              data[field] = {
                type: DATA_DRIFT_TYPE.NUMERIC,
                pValue: driftedResp.aggregations[`${field}_ks_test`].two_sided,
                range: fieldRange[field],
                referenceHistogram:
                  referenceHistogramResponse.aggregations[`${field}_histogram`]?.buckets ?? [],
                productionHistogram:
                  productionHistogramResponse.aggregations[`${field}_histogram`]?.buckets ?? [],
              };
            }
            if (type === DATA_DRIFT_TYPE.CATEGORICAL) {
              data[field] = {
                type: DATA_DRIFT_TYPE.CATEGORICAL,
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
          setLoaded(1);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`An error occurred while fetching data drift data:`, e);
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataSearch, JSON.stringify({ fields, timeRanges }), currentDataView?.id, searchString]
  );
  const dataDriftResult = useMemo(() => ({ ...result, loaded }), [result, loaded]);
  return dataDriftResult;
};
