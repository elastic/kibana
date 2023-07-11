/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Query } from '@kbn/data-plugin/common';
import { cloneDeep } from 'lodash';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { type SearchQueryLanguage } from '@kbn/ml-query-utils';

import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import { i18n } from '@kbn/i18n';
import { useDataVisualizerKibana } from '../kibana_context';
import {
  REFERENCE_LABEL,
  PRODUCTION_LABEL,
  DRIFT_P_VALUE_THRESHOLD,
  DATA_COMPARISON_TYPE,
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
  DataComparisonField,
  TimeRange,
} from './types';
import { computeChi2PValue } from './data_comparison_utils';

export const getDataComparisonType = (kibanaType: string): DataComparisonField['type'] => {
  switch (kibanaType) {
    case 'number':
      return DATA_COMPARISON_TYPE.NUMERIC;
    case 'boolean':
    case 'string':
      return DATA_COMPARISON_TYPE.CATEGORICAL;
    default:
      return DATA_COMPARISON_TYPE.UNSUPPORTED;
  }
};

export const useDataSearch = () => {
  const { data } = useDataVisualizerKibana().services;

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

const processDataComparisonResult = (
  result: Record<string, NumericDriftData | CategoricalDriftData>
): Feature[] => {
  return Object.entries(result).map(([featureName, data]) => {
    if (isNumericDriftData(data)) {
      // normalize data.referenceHistogram and data.productionHistogram to use frequencies instead of counts
      const referenceHistogram: Histogram[] = normalizeHistogram(data.referenceHistogram);
      const productionHistogram: Histogram[] = normalizeHistogram(data.productionHistogram);

      return {
        featureName,
        fieldType: DATA_COMPARISON_TYPE.NUMERIC,
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
      fieldType: DATA_COMPARISON_TYPE.CATEGORICAL,
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

const getDataComparisonQuery = ({
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
          format: 'epoch_millis',
        },
      },
    };
  }

  const query: Query['query'] = cloneDeep(
    !searchQuery || isPopulatedObject(searchQuery, ['match_all'])
      ? getDefaultDSLQuery()
      : searchQuery
  );

  if (rangeFilter && isPopulatedObject<string, unknown>(query, ['bool'])) {
    if (Array.isArray(query.bool.filter)) {
      query.bool.filter.push(rangeFilter);
    } else {
      query.bool.filter = [rangeFilter];
    }
  }

  const refDataQuery: { query: Query['query']; runtime_mappings?: MappingRuntimeFields } = {
    query,
  };
  if (runtimeFields) {
    refDataQuery.runtime_mappings = runtimeFields;
  }
  return refDataQuery;
};

export const useFetchDataComparisonResult = ({
  fields,
  currentDataView,
  timeRanges,
  searchQuery,
  searchString,
}: {
  fields?: DataComparisonField[];
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
  const [progressMessage, setProgressMessage] = useState<string | undefined>();

  useEffect(
    () => {
      let controller: AbortController = new AbortController();

      const doFetchEsRequest = async function () {
        controller.abort();

        setLoaded(0);
        setResult({
          data: undefined,
          status: FETCH_STATUS.NOT_INITIATED,
          error: undefined,
        });

        setProgressMessage(
          i18n.translate('xpack.dataVisualizer.dataComparison.progress.started', {
            defaultMessage: `Ready to fetch data for comparison.`,
          })
        );

        controller = new AbortController();

        const signal = controller.signal;

        if (!fields || !currentDataView) return;

        setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

        // Place holder for when there might be difference data views in the future
        const referenceIndex = currentDataView?.getIndexPattern();
        const productionIndex = referenceIndex;

        const runtimeFields = currentDataView?.getRuntimeMappings();

        setProgressMessage(
          i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadedFields', {
            defaultMessage: `Loaded fields from index '{referenceIndex}' to analyze.`,
            values: { referenceIndex },
          })
        );
        const refDataQuery = getDataComparisonQuery({
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

          const fieldsCount = fields.length;
          // for each field with type "numeric", add a percentiles agg to the request
          for (const { field, type } of fields) {
            // if the field is numeric, add a percentiles and stats aggregations to the request
            if (type === DATA_COMPARISON_TYPE.NUMERIC) {
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
            if (type === DATA_COMPARISON_TYPE.CATEGORICAL) {
              baselineRequest.body.aggs[`${field}_terms`] = {
                terms: {
                  field,
                  size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
                },
              };
            }
          }

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadingReference', {
              defaultMessage: `Loading reference data for {fieldsCount} fields.`,
              values: { fieldsCount },
            })
          );
          const baselineResponse = await dataSearch(baselineRequest, signal);

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadedReference', {
              defaultMessage: `Loaded reference data.`,
            })
          );

          setLoaded(0.25);

          if (!baselineResponse?.aggregations) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: `Unable to fetch percentiles data from ${referenceIndex}`,
            });
            return;
          }

          const prodDataQuery = getDataComparisonQuery({
            searchQuery,
            datetimeField: currentDataView?.timeFieldName,
            runtimeFields,
            timeRange: timeRanges?.production,
          });

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadingProduction', {
              defaultMessage: `Loading production data for {fieldsCount} fields.`,
              values: { fieldsCount },
            })
          );

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
              type === DATA_COMPARISON_TYPE.NUMERIC
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
            if (type === DATA_COMPARISON_TYPE.CATEGORICAL) {
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
          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadedBaseline', {
              defaultMessage: `Loaded production data.`,
              values: { referenceIndex },
            })
          );

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
            if (type === DATA_COMPARISON_TYPE.NUMERIC) {
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

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadingHistogramData', {
              defaultMessage: `Loading histogram data.`,
              values: { referenceIndex },
            })
          );

          const [productionHistogramResponse, referenceHistogramResponse] = await Promise.all([
            dataSearch(productionHistogramRequest, signal),
            dataSearch(referenceHistogramRequest, signal),
          ]);

          const data: Record<string, NumericDriftData | CategoricalDriftData> = {};
          for (const { field, type } of fields) {
            if (
              type === DATA_COMPARISON_TYPE.NUMERIC &&
              referenceHistogramResponse.aggregations &&
              productionHistogramResponse.aggregations
            ) {
              data[field] = {
                type: DATA_COMPARISON_TYPE.NUMERIC,
                pValue: driftedResp.aggregations[`${field}_ks_test`].two_sided,
                range: fieldRange[field],
                referenceHistogram:
                  referenceHistogramResponse.aggregations[`${field}_histogram`]?.buckets ?? [],
                productionHistogram:
                  productionHistogramResponse.aggregations[`${field}_histogram`]?.buckets ?? [],
              };
            }
            if (
              type === DATA_COMPARISON_TYPE.CATEGORICAL &&
              driftedResp.aggregations &&
              baselineResponse.aggregations
            ) {
              data[field] = {
                type: DATA_COMPARISON_TYPE.CATEGORICAL,
                driftedTerms: driftedResp.aggregations[`${field}_terms`].buckets,
                driftedSumOtherDocCount:
                  driftedResp.aggregations[`${field}_terms`].sum_other_doc_count,
                baselineTerms: baselineResponse.aggregations[`${field}_terms`].buckets,
                baselineSumOtherDocCount:
                  baselineResponse.aggregations[`${field}_terms`].sum_other_doc_count,
              };
            }
          }

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataComparison.progress.loadedHistogramData', {
              defaultMessage: `Successfully loaded histogram data.`,
              values: { referenceIndex },
            })
          );

          setResult({
            data: processDataComparisonResult(data),
            status: FETCH_STATUS.SUCCESS,
          });
          setLoaded(1);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`An error occurred while fetching data comparison data:`, e);
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: e,
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
  const dataComparisonResult = useMemo(
    () => ({ ...result, loaded, progressMessage }),
    [result, loaded, progressMessage]
  );
  return dataComparisonResult;
};
