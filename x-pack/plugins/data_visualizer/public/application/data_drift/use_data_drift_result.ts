/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, cloneDeep, flatten } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  MappingRuntimeFields,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';

import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Query } from '@kbn/data-plugin/common';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import { i18n } from '@kbn/i18n';
import type { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { isDefined } from '@kbn/ml-is-defined';
import { computeChi2PValue, type Histogram } from '@kbn/ml-chi2test';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';

import type { AggregationsMultiTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import { buildEsQuery } from '@kbn/es-query';
import { useDataVisualizerKibana } from '../kibana_context';

import { useDataDriftStateManagerContext } from './use_state_manager';

import {
  REFERENCE_LABEL,
  COMPARISON_LABEL,
  DRIFT_P_VALUE_THRESHOLD,
  DATA_COMPARISON_TYPE,
} from './constants';

import type {
  NumericDriftData,
  CategoricalDriftData,
  Range,
  Result,
  Feature,
  DataDriftField,
  TimeRange,
  ComparisonHistogram,
} from './types';
import { FETCH_STATUS, isNumericDriftData } from './types';
import { isFulfilled, isRejected } from '../common/util/promise_all_settled_utils';

export const getDataComparisonType = (kibanaType: string): DataDriftField['type'] => {
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

type UseDataSearch = ReturnType<typeof useDataSearch>;

const computeDomain = (comparisonDistribution: Histogram[] | ComparisonHistogram[]) => {
  const domain: NonNullable<Feature['domain']> = {
    x: { min: 0, max: 0 },
    percentage: { min: 0, max: 0 },
    doc_count: { min: 0, max: 0 },
  };

  comparisonDistribution.forEach((dist) => {
    if (isDefined<number>(dist.percentage)) {
      if (dist.percentage >= domain.percentage.max) {
        domain.percentage.max = dist.percentage;
      } else {
        domain.percentage.min = dist.percentage;
      }
    }

    if (isDefined<number>(dist.doc_count)) {
      if (dist.doc_count >= domain.doc_count.max) {
        domain.doc_count.max = dist.doc_count;
      } else {
        domain.doc_count.min = dist.doc_count;
      }
    }

    const parsedKey = typeof dist.key === 'number' ? dist.key : parseFloat(dist.key);
    if (!isNaN(parsedKey)) {
      if (parsedKey >= domain.x.max) {
        domain.x.max = parsedKey;
      } else {
        domain.x.min = parsedKey;
      }
    }
  });
  return domain;
};
export const useDataSearch = <T>() => {
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
          throw Error(error);
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
      // normalize data.referenceHistogram and data.comparisonHistogram to use frequencies instead of counts
      const referenceHistogram: Histogram[] = normalizeHistogram(data.referenceHistogram);
      const comparisonHistogram: Histogram[] = normalizeHistogram(data.comparisonHistogram);

      const comparisonDistribution: ComparisonHistogram[] = [
        ...referenceHistogram.map((h) => ({ ...h, g: REFERENCE_LABEL })),
        ...comparisonHistogram.map((h) => ({ ...h, g: COMPARISON_LABEL })),
      ];

      const domain = computeDomain(comparisonHistogram);
      return {
        featureName,
        secondaryType: data.secondaryType,
        fieldType: DATA_COMPARISON_TYPE.NUMERIC,
        driftDetected: data.pValue < DRIFT_P_VALUE_THRESHOLD,
        similarityTestPValue: data.pValue,
        referenceHistogram: referenceHistogram ?? [],
        comparisonHistogram: comparisonHistogram ?? [],
        comparisonDistribution,
        domain,
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
    const comparisonTotalDocCount: number = data.driftedTerms.reduce(
      (acc, term) => acc + term.doc_count,
      data.driftedSumOtherDocCount
    );

    // Sort the categories (allKeys) by the following metric: Math.abs(comparisonDocCount-referenceDocCount)/referenceDocCount
    const sortedKeys = allKeys
      .map((k) => {
        const key = k.toString();
        const baselineTerm = data.baselineTerms.find((t) => t.key === key);
        const driftedTerm = data.driftedTerms.find((t) => t.key === key);
        if (baselineTerm && driftedTerm) {
          const referencePercentage = baselineTerm.doc_count / referenceTotalDocCount;
          const comparisonPercentage = driftedTerm.doc_count / comparisonTotalDocCount;
          return {
            key,
            relative_drift:
              Math.abs(comparisonPercentage - referencePercentage) / referencePercentage,
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
      comparisonTotalDocCount
    );

    const pValue: number = computeChi2PValue(normalizedBaselineTerms, normalizedDriftedTerms);
    const comparisonDistribution = [
      ...normalizedBaselineTerms.map((h) => ({ ...h, g: REFERENCE_LABEL })),
      ...normalizedDriftedTerms.map((h) => ({ ...h, g: COMPARISON_LABEL })),
    ];
    return {
      featureName,
      secondaryType: data.secondaryType,
      fieldType: DATA_COMPARISON_TYPE.CATEGORICAL,
      driftDetected: pValue < DRIFT_P_VALUE_THRESHOLD,
      similarityTestPValue: pValue,
      referenceHistogram: normalizedBaselineTerms ?? [],
      comparisonHistogram: normalizedDriftedTerms ?? [],
      comparisonDistribution,
      domain: computeDomain(comparisonDistribution),
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
  searchQuery?: estypes.QueryDslQueryContainer;
  datetimeField?: string;
  timeRange?: TimeRange;
}): NonNullable<estypes.SearchRequest['body']> => {
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

  const query = cloneDeep(
    !searchQuery || isPopulatedObject(searchQuery, ['match_all'])
      ? getDefaultDSLQuery()
      : searchQuery
  );

  if (rangeFilter && isPopulatedObject<string, QueryDslBoolQuery>(query, ['bool'])) {
    if (Array.isArray(query.bool.filter)) {
      query.bool.filter.push(rangeFilter);
    } else {
      query.bool.filter = [rangeFilter];
    }
  }

  const queryAndRuntimeMappings: NonNullable<estypes.SearchRequest['body']> = {
    query,
  };
  if (runtimeFields) {
    queryAndRuntimeMappings.runtime_mappings = runtimeFields;
  }
  return queryAndRuntimeMappings;
};

const fetchReferenceBaselineData = async ({
  baseRequest,
  fields,
  randomSamplerWrapper,
  dataSearch,
  signal,
}: {
  baseRequest: EsRequestParams;
  dataSearch: UseDataSearch;
  fields: DataDriftField[];
  randomSamplerWrapper: RandomSamplerWrapper;
  signal: AbortSignal;
}) => {
  const baselineRequest = { ...baseRequest };
  const baselineRequestAggs: Record<string, estypes.AggregationsAggregationContainer> = {};

  // for each field with type "numeric", add a percentiles agg to the request
  for (const { field, type } of fields) {
    // if the field is numeric, add a percentiles and stats aggregations to the request
    if (type === DATA_COMPARISON_TYPE.NUMERIC) {
      baselineRequestAggs[`${field}_percentiles`] = {
        percentiles: {
          field,
          percents,
        },
      };
      baselineRequestAggs[`${field}_stats`] = {
        stats: {
          field,
        },
      };
    }
    // if the field is categorical, add a terms aggregation to the request
    if (type === DATA_COMPARISON_TYPE.CATEGORICAL) {
      baselineRequestAggs[`${field}_terms`] = {
        terms: {
          field,
          size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
        },
      };
    }
  }

  const baselineResponse = await dataSearch(
    {
      ...baselineRequest,
      body: { ...baselineRequest.body, aggs: randomSamplerWrapper.wrap(baselineRequestAggs) },
    },
    signal
  );

  return baselineResponse;
};

const fetchComparisonDriftedData = async ({
  dataSearch,
  fields,
  baselineResponseAggs,
  baseRequest,
  baselineRequest,
  randomSamplerWrapper,
  signal,
}: {
  baseRequest: EsRequestParams;
  dataSearch: UseDataSearch;
  fields: DataDriftField[];
  randomSamplerWrapper: RandomSamplerWrapper;
  signal: AbortSignal;
  baselineResponseAggs: object;
  baselineRequest: EsRequestParams;
}) => {
  const driftedRequest = { ...baseRequest };

  const driftedRequestAggs: Record<string, estypes.AggregationsAggregationContainer> = {};

  // Since aggregation is not able to split the values into distinct 5% intervals,
  // this breaks our assumption of uniform distributed fractions in the`ks_test`.
  // So, to fix this in the general case, we need to run an additional ranges agg to get the doc count for the ranges
  // that we get from the percentiles aggregation
  // and use it in the bucket_count_ks_test
  const rangesRequestAggs: Record<string, estypes.AggregationsAggregationContainer> = {};

  for (const { field, type } of fields) {
    if (
      isPopulatedObject(baselineResponseAggs, [`${field}_percentiles`]) &&
      type === DATA_COMPARISON_TYPE.NUMERIC
    ) {
      // create ranges based on percentiles
      const percentiles = Object.values<number>(
        (baselineResponseAggs[`${field}_percentiles`] as Record<string, { values: number }>).values
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
      const rangeAggs = {
        range: {
          field,
          ranges,
        },
      };
      // add range and bucket_count_ks_test to the request
      rangesRequestAggs[`${field}_ranges`] = rangeAggs;
      driftedRequestAggs[`${field}_ranges`] = rangeAggs;

      // add stats aggregation to the request
      driftedRequestAggs[`${field}_stats`] = {
        stats: {
          field,
        },
      };
    }
    // if feature is categoric perform terms aggregation
    if (type === DATA_COMPARISON_TYPE.CATEGORICAL) {
      driftedRequestAggs[`${field}_terms`] = {
        terms: {
          field,
          size: 100, // also DFA can potentially handle problems with 100 categories, for visualization purposes we will use top 10
        },
      };
    }
  }

  // Compute fractions based on results of ranges
  const rangesResp = await dataSearch(
    {
      ...baselineRequest,
      body: { ...baselineRequest.body, aggs: randomSamplerWrapper.wrap(rangesRequestAggs) },
    },
    signal
  );

  const fieldsWithNoOverlap = new Set<string>();
  const rangesAggs = rangesResp?.aggregations?.sample
    ? rangesResp.aggregations.sample
    : rangesResp?.aggregations;
  for (const { field } of fields) {
    if (
      isPopulatedObject<
        string,
        estypes.AggregationsMultiBucketAggregateBase<AggregationsMultiTermsBucketKeys>
      >(rangesAggs, [`${field}_ranges`])
    ) {
      const buckets = rangesAggs[`${field}_ranges`].buckets;

      if (Array.isArray(buckets)) {
        const totalSumOfAllBuckets = buckets.reduce((acc, bucket) => acc + bucket.doc_count, 0);

        const fractions = buckets.map((bucket) => ({
          ...bucket,
          fraction: bucket.doc_count / totalSumOfAllBuckets,
        }));

        if (totalSumOfAllBuckets > 0) {
          driftedRequestAggs[`${field}_ks_test`] = {
            bucket_count_ks_test: {
              buckets_path: `${field}_ranges > _count`,
              alternative: ['two_sided'],
              ...(totalSumOfAllBuckets > 0
                ? { fractions: fractions.map((bucket) => Number(bucket.fraction.toFixed(3))) }
                : {}),
            },
          };
        } else {
          // If all doc_counts are 0, that means there's no overlap whatsoever
          // in which case we don't need to make the ks test agg, because it defaults to astronomically small value
          fieldsWithNoOverlap.add(field);
        }
      }
    }
  }

  const driftedResp = await dataSearch(
    {
      ...driftedRequest,
      body: { ...driftedRequest.body, aggs: randomSamplerWrapper.wrap(driftedRequestAggs) },
    },
    signal
  );

  fieldsWithNoOverlap.forEach((field) => {
    if (driftedResp?.aggregations) {
      driftedResp.aggregations[`${field}_ks_test`] = {
        // Setting -Infinity to represent astronomically small number
        // which would be represented as < 0.000001 in table
        two_sided: -Infinity,
      };
    }
  });

  return driftedResp;
};

const fetchHistogramData = async ({
  dataSearch,
  fields,
  driftedRespAggs,
  baselineResponseAggs,
  baseRequest,
  randomSamplerWrapper,
  signal,
}: {
  baseRequest: EsRequestParams;
  dataSearch: UseDataSearch;
  fields: DataDriftField[];
  randomSamplerWrapper: RandomSamplerWrapper;
  signal: AbortSignal;
  baselineResponseAggs: Record<string, estypes.AggregationsStatsAggregate>;
  driftedRespAggs: Record<string, estypes.AggregationsStatsAggregate>;
}) => {
  const histogramRequestAggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  const fieldRange: { [field: string]: Range } = {};

  for (const { field, type } of fields) {
    // add histogram aggregation with min and max from baseline
    if (
      type === DATA_COMPARISON_TYPE.NUMERIC &&
      baselineResponseAggs[`${field}_stats`] &&
      driftedRespAggs[`${field}_stats`]
    ) {
      const numBins = 10;
      const min = Math.min(
        baselineResponseAggs[`${field}_stats`].min!,
        driftedRespAggs[`${field}_stats`].min!
      );
      const max = Math.max(
        baselineResponseAggs[`${field}_stats`].max!,
        driftedRespAggs[`${field}_stats`].max!
      );
      const interval = (max - min) / numBins;

      if (interval === 0) {
        continue;
      }
      const offset = min;
      fieldRange[field] = { min, max, interval };
      histogramRequestAggs[`${field}_histogram`] = {
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
  if (isPopulatedObject(histogramRequestAggs)) {
    const histogramRequest = {
      ...baseRequest,
      body: {
        ...baseRequest.body,
        aggs: randomSamplerWrapper.wrap(histogramRequestAggs),
      },
    };

    return dataSearch(histogramRequest, signal);
  }
};

type EsRequestParams = NonNullable<
  IKibanaSearchRequest<NonNullable<estypes.SearchRequest>>['params']
>;

interface ReturnedError {
  error?: string;
  errorBody?: string;
}

function isReturnedError(arg: unknown): arg is ReturnedError {
  return isPopulatedObject(arg, ['error']);
}

/**
 * Help split one big request into multiple requests (with max of 30 fields/request)
 * to avoid too big of a data payload
 * Returns a merged
 * @param fields - list of fields to split
 * @param randomSamplerWrapper - helper from randomSampler to pack and unpack 'sample' path from esResponse.aggregations
 * @param asyncFetchFn - callback function with the divided fields
 */
export const fetchInParallelChunks = async <
  ReturnedRespFromFetchFn extends { aggregations: Record<string, AggregationsAggregate> }
>({
  fields,
  randomSamplerWrapper,
  asyncFetchFn,
  errorMsg,
}: {
  fields: DataDriftField[];
  randomSamplerWrapper: RandomSamplerWrapper;
  asyncFetchFn: (chunkedFields: DataDriftField[]) => Promise<ReturnedRespFromFetchFn>;
  errorMsg?: string;
}): Promise<ReturnedRespFromFetchFn | ReturnedError> => {
  const { unwrap } = randomSamplerWrapper;
  const results = await Promise.allSettled(
    chunk(fields, 30).map((chunkedFields: DataDriftField[]) => asyncFetchFn(chunkedFields))
  );

  const mergedResults = results
    .filter(isFulfilled)
    .filter((r) => r.value)
    .map((r) => {
      try {
        return unwrap(r?.value.aggregations);
      } catch (e) {
        return undefined;
      }
    })
    .filter(isDefined);

  if (mergedResults.length === 0) {
    const error = results.find(isRejected);
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return {
        error: errorMsg ?? 'An error occurred fetching data drift data',
        errorBody: error.reason.message,
      };
    }
  }

  const baselineResponseAggs = flatten(mergedResults).reduce(
    (prev, acc) => ({ ...acc, ...prev }),
    {}
  );
  return baselineResponseAggs;
};

const initialState = {
  data: undefined,
  status: FETCH_STATUS.NOT_INITIATED,
  error: undefined,
  errorBody: undefined,
};

export interface InitialSettings {
  index: string;
  comparison: string;
  reference: string;
  timeField: string;
}

export const useFetchDataComparisonResult = (
  {
    fields,
    initialSettings,
    currentDataView,
    timeRanges,
    searchString,
    searchQueryLanguage,
    lastRefresh,
  }: {
    lastRefresh: number;
    initialSettings?: InitialSettings;
    fields?: DataDriftField[];
    currentDataView?: DataView;
    timeRanges?: { reference: TimeRange; comparison: TimeRange };
    searchString?: Query['query'];
    searchQueryLanguage?: SearchQueryLanguage;
  } = { lastRefresh: 0 }
) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<Result<Feature[]>>(initialState);
  const [loaded, setLoaded] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | undefined>();
  const abortController = useRef(new AbortController());
  const {
    uiSettings,
    data: { query: queryManager },
  } = useDataVisualizerKibana().services;

  const { reference: referenceStateManager, comparison: comparisonStateManager } =
    useDataDriftStateManagerContext();

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
    setResult(initialState);
    setProgressMessage(undefined);
    setLoaded(0);
  }, []);

  useEffect(
    () => {
      const doFetchEsRequest = async function () {
        const randomSampler = referenceStateManager.randomSampler;
        const randomSamplerProd = comparisonStateManager.randomSampler;
        if (!randomSampler || !randomSamplerProd) return;

        const randomSamplerWrapper = randomSampler.createRandomSamplerWrapper();
        const prodRandomSamplerWrapper = randomSamplerProd.createRandomSamplerWrapper();

        setLoaded(0);
        setResult({
          data: undefined,
          status: FETCH_STATUS.NOT_INITIATED,
          error: undefined,
        });

        setProgressMessage(
          i18n.translate('xpack.dataVisualizer.dataDrift.progress.started', {
            defaultMessage: `Ready to fetch data for comparison.`,
          })
        );

        const signal = abortController.current.signal;
        if (!fields || !currentDataView) return;

        setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

        // Placeholder for when there might be difference data views in the future
        const referenceIndex = initialSettings
          ? initialSettings.reference
          : currentDataView?.getIndexPattern();
        const comparisonIndex = initialSettings ? initialSettings.comparison : referenceIndex;

        const runtimeFields = currentDataView?.getRuntimeMappings();

        setProgressMessage(
          i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadedFields', {
            defaultMessage: `Loaded fields from index ''{referenceIndex}'' to analyze.`,
            values: { referenceIndex },
          })
        );

        const kqlQuery =
          searchString !== undefined && searchQueryLanguage !== undefined
            ? ({ query: searchString, language: searchQueryLanguage } as Query)
            : undefined;

        const refDataQuery = getDataComparisonQuery({
          searchQuery: buildEsQuery(
            currentDataView,
            kqlQuery ?? [],
            mapAndFlattenFilters([
              ...queryManager.filterManager.getFilters(),
              ...(referenceStateManager.filters ?? []),
            ]),
            uiSettings ? getEsQueryConfig(uiSettings) : undefined
          ),
          datetimeField: currentDataView?.timeFieldName,
          runtimeFields,
          timeRange: timeRanges?.reference,
        });

        try {
          const fieldsCount = fields.length;

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadingReference', {
              defaultMessage: `Loading reference data for {fieldsCount} fields.`,
              values: { fieldsCount },
            })
          );

          const baselineRequest: EsRequestParams = {
            index: referenceIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...refDataQuery,
            },
          };

          const baselineResponseAggs = await fetchInParallelChunks({
            fields,
            randomSamplerWrapper,

            asyncFetchFn: (chunkedFields) =>
              // @ts-expect-error upgrade typescript v4.9.5
              fetchReferenceBaselineData({
                dataSearch,
                baseRequest: baselineRequest,
                fields: chunkedFields,
                randomSamplerWrapper,
                signal,
              }),
          });

          if (isReturnedError(baselineResponseAggs)) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: baselineResponseAggs.error,
              errorBody: baselineResponseAggs.errorBody,
            });
            return;
          }

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadedReference', {
              defaultMessage: `Loaded reference data.`,
            })
          );
          setLoaded(0.25);

          const prodDataQuery = getDataComparisonQuery({
            searchQuery: buildEsQuery(
              currentDataView,
              kqlQuery ?? [],
              mapAndFlattenFilters([
                ...queryManager.filterManager.getFilters(),
                ...(comparisonStateManager.filters ?? []),
              ]),
              uiSettings ? getEsQueryConfig(uiSettings) : undefined
            ),
            datetimeField: currentDataView?.timeFieldName,
            runtimeFields,
            timeRange: timeRanges?.comparison,
          });

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadingComparison', {
              defaultMessage: `Loading comparison data for {fieldsCount} fields.`,
              values: { fieldsCount },
            })
          );

          const driftedRequest: EsRequestParams = {
            index: comparisonIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...prodDataQuery,
            },
          };

          const driftedRespAggs = await fetchInParallelChunks({
            fields,
            randomSamplerWrapper: prodRandomSamplerWrapper,

            // @ts-expect-error upgrade typescript v4.9.5
            asyncFetchFn: (chunkedFields: DataDriftField[]) =>
              fetchComparisonDriftedData({
                dataSearch,
                baseRequest: driftedRequest,
                baselineRequest,
                baselineResponseAggs,
                fields: chunkedFields,
                randomSamplerWrapper: prodRandomSamplerWrapper,
                signal,
              }),
          });

          if (isReturnedError(driftedRespAggs)) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: driftedRespAggs.error,
              errorBody: driftedRespAggs.errorBody,
            });
            return;
          }

          setLoaded(0.5);
          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadedComparison', {
              defaultMessage: `Loaded comparison data. Now loading histogram data.`,
            })
          );

          const referenceHistogramRequest: EsRequestParams = {
            index: referenceIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...refDataQuery,
            },
          };

          const referenceHistogramRespAggs = await fetchInParallelChunks({
            fields,
            randomSamplerWrapper,

            // @ts-expect-error upgrade typescript v4.9.5
            asyncFetchFn: (chunkedFields: DataDriftField[]) =>
              fetchHistogramData({
                dataSearch,
                baseRequest: referenceHistogramRequest,
                // @ts-expect-error upgrade typescript v4.9.5
                baselineResponseAggs,
                // @ts-expect-error upgrade typescript v4.9.5
                driftedRespAggs,
                fields: chunkedFields,
                randomSamplerWrapper,
                signal,
              }),
          });

          if (isReturnedError(referenceHistogramRespAggs)) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: referenceHistogramRespAggs.error,
              errorBody: referenceHistogramRespAggs.errorBody,
            });
            return;
          }

          setLoaded(0.75);
          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadedReferenceHistogram', {
              defaultMessage: `Loaded histogram data for reference data set.`,
            })
          );

          const comparisonHistogramRequest: EsRequestParams = {
            index: comparisonIndex,
            body: {
              size: 0,
              aggs: {} as Record<string, estypes.AggregationsAggregationContainer>,
              ...prodDataQuery,
            },
          };

          const comparisonHistogramRespAggs = await fetchInParallelChunks({
            fields,
            randomSamplerWrapper,

            // @ts-expect-error upgrade typescript v4.9.5
            asyncFetchFn: (chunkedFields: DataDriftField[]) =>
              fetchHistogramData({
                dataSearch,
                baseRequest: comparisonHistogramRequest,
                // @ts-expect-error upgrade typescript v4.9.5
                baselineResponseAggs,
                // @ts-expect-error upgrade typescript v4.9.5
                driftedRespAggs,
                fields: chunkedFields,
                randomSamplerWrapper,
                signal,
              }),
          });

          if (isReturnedError(comparisonHistogramRespAggs)) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: comparisonHistogramRespAggs.error,
              errorBody: comparisonHistogramRespAggs.errorBody,
            });
            return;
          }

          const data: Record<string, NumericDriftData | CategoricalDriftData> = {};
          for (const { field, type, secondaryType } of fields) {
            if (
              type === DATA_COMPARISON_TYPE.NUMERIC &&
              // @ts-expect-error upgrade typescript v4.9.5
              driftedRespAggs[`${field}_ks_test`] &&
              // @ts-expect-error upgrade typescript v4.9.5
              referenceHistogramRespAggs[`${field}_histogram`] &&
              // @ts-expect-error upgrade typescript v4.9.5
              comparisonHistogramRespAggs[`${field}_histogram`]
            ) {
              data[field] = {
                secondaryType,
                type: DATA_COMPARISON_TYPE.NUMERIC,
                // @ts-expect-error upgrade typescript v4.9.5
                pValue: driftedRespAggs[`${field}_ks_test`].two_sided,
                // @ts-expect-error upgrade typescript v4.9.5
                referenceHistogram: referenceHistogramRespAggs[`${field}_histogram`].buckets,
                // @ts-expect-error upgrade typescript v4.9.5
                comparisonHistogram: comparisonHistogramRespAggs[`${field}_histogram`].buckets,
              };
            }
            if (
              type === DATA_COMPARISON_TYPE.CATEGORICAL &&
              // @ts-expect-error upgrade typescript v4.9.5
              driftedRespAggs[`${field}_terms`] &&
              // @ts-expect-error upgrade typescript v4.9.5
              baselineResponseAggs[`${field}_terms`]
            ) {
              data[field] = {
                secondaryType,
                type: DATA_COMPARISON_TYPE.CATEGORICAL,
                // @ts-expect-error upgrade typescript v4.9.5
                driftedTerms: driftedRespAggs[`${field}_terms`].buckets ?? [],
                // @ts-expect-error upgrade typescript v4.9.5
                driftedSumOtherDocCount: driftedRespAggs[`${field}_terms`].sum_other_doc_count,
                // @ts-expect-error upgrade typescript v4.9.5
                baselineTerms: baselineResponseAggs[`${field}_terms`].buckets ?? [],
                baselineSumOtherDocCount:
                  // @ts-expect-error upgrade typescript v4.9.5
                  baselineResponseAggs[`${field}_terms`].sum_other_doc_count,
              };
            }
          }

          setProgressMessage(
            i18n.translate('xpack.dataVisualizer.dataDrift.progress.loadedHistogramData', {
              defaultMessage: `Loaded histogram data for comparison data set.`,
            })
          );

          setResult({
            data: processDataComparisonResult(data),
            status: FETCH_STATUS.SUCCESS,
          });
          setLoaded(1);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: 'An error occurred while fetching data drift data',
            errorBody: extractErrorMessage(e),
          });
        }
      };

      doFetchEsRequest();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      referenceStateManager,
      comparisonStateManager,
      dataSearch,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify({
        fields,
        timeRanges,
        currentDataView: currentDataView?.id,
        searchString,
        lastRefresh,
      }),
    ]
  );
  const dataComparisonResult = useMemo(
    () => ({ result: { ...result, loaded, progressMessage }, cancelRequest }),
    [result, loaded, progressMessage, cancelRequest]
  );
  return dataComparisonResult;
};
