/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import type { Query } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { RandomSampler, RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { each, get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
import useObservable from 'react-use/lib/useObservable';
import { useDataVisualizerKibana } from '../../kibana_context';
import { displayError } from '../util/display_error';

export const RANDOM_SAMPLER_SEED = 3867418;

export interface DocumentStats {
  sampleProbability: number;
  totalCount: number;
  documentCountStats?: DocumentCountStats;
  documentCountStatsCompare?: DocumentCountStats;
}

export interface DocumentCountStats {
  interval?: number;
  buckets?: { [key: string]: number };
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  totalCount: number;
}

export interface DocumentStatsSearchStrategyParams {
  earliest?: number;
  latest?: number;
  intervalMs?: number;
  index: string;
  searchQuery: Query['query'];
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  fieldsToFetch?: string[];
  selectedSignificantItem?: SignificantItem;
  includeSelectedSignificantItem?: boolean;
  trackTotalHits?: boolean;
}

export const getDocumentCountStatsRequest = (
  params: DocumentStatsSearchStrategyParams,
  randomSamplerWrapper?: RandomSamplerWrapper,
  skipAggs = false
) => {
  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
    fieldsToFetch,
    trackTotalHits,
  } = params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, searchQuery);

  const rawAggs: Record<string, estypes.AggregationsAggregationContainer> = {
    eventRate: {
      date_histogram: {
        field: timeFieldName,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 0,
        ...(earliestMs !== undefined && latestMs !== undefined
          ? {
              extended_bounds: {
                min: earliestMs,
                max: latestMs,
              },
            }
          : {}),
      },
    },
  };

  const aggs = randomSamplerWrapper ? randomSamplerWrapper.wrap(rawAggs) : rawAggs;

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(!fieldsToFetch &&
    !skipAggs &&
    timeFieldName !== undefined &&
    intervalMs !== undefined &&
    intervalMs > 0
      ? { aggs }
      : {}),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
    track_total_hits: trackTotalHits === true,
    size,
  };
  return {
    index,
    body: searchBody,
  };
};

export const processDocumentCountStats = (
  body: estypes.SearchResponse | undefined,
  params: DocumentStatsSearchStrategyParams,
  randomSamplerWrapper?: RandomSamplerWrapper
): DocumentCountStats | undefined => {
  if (!body) return undefined;

  const totalCount = (body.hits.total as estypes.SearchTotalHits).value ?? body.hits.total ?? 0;

  if (
    params.intervalMs === undefined ||
    params.earliest === undefined ||
    params.latest === undefined
  ) {
    return {
      totalCount,
    };
  }
  const buckets: { [key: string]: number } = {};
  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    randomSamplerWrapper && body.aggregations !== undefined
      ? randomSamplerWrapper.unwrap(body.aggregations)
      : body.aggregations,
    ['eventRate', 'buckets'],
    []
  );
  each(dataByTimeBucket, (dataForTime) => {
    const time = dataForTime.key;
    buckets[time] = dataForTime.doc_count;
  });

  return {
    interval: params.intervalMs,
    buckets,
    timeRangeEarliest: params.earliest,
    timeRangeLatest: params.latest,
    totalCount,
  };
};

export interface DocumentStatsSearchStrategyParams {
  earliest?: number;
  latest?: number;
  intervalMs?: number;
  index: string;
  searchQuery: Query['query'];
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  fieldsToFetch?: string[];
  selectedSignificantItem?: SignificantItem;
  includeSelectedSignificantItem?: boolean;
  trackTotalHits?: boolean;
}

export function useDocumentCountStats<TParams extends DocumentStatsSearchStrategyParams>(
  searchParams: TParams | undefined,
  lastRefresh: number,
  randomSampler: RandomSampler
): DocumentStats {
  const {
    data,
    notifications: { toasts },
  } = useDataVisualizerKibana().services;

  const abortCtrl = useRef(new AbortController());

  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    sampleProbability: 1,
    totalCount: 0,
  });

  const [documentStatsCache, setDocumentStatsCache] = useState<Record<string, DocumentStats>>({});
  const samplingProbability = useObservable(
    randomSampler.getProbability$(),
    randomSampler.getProbability()
  );

  const fetchDocumentCountData = useCallback(async () => {
    if (!searchParams) return;

    const cacheKey = stringHash(
      `${JSON.stringify(searchParams)}-${randomSampler.getProbability()}`
    );

    if (documentStatsCache[cacheKey]) {
      setDocumentStats(documentStatsCache[cacheKey]);
      return;
    }

    try {
      abortCtrl.current = new AbortController();

      const totalHitsParams = {
        ...searchParams,
        selectedSignificantTerm: undefined,
        trackTotalHits: true,
      };

      const totalHitsResp = await lastValueFrom(
        data.search.search(
          {
            params: getDocumentCountStatsRequest(totalHitsParams, undefined, true),
          },
          { abortSignal: abortCtrl.current.signal }
        )
      );
      const totalHitsStats = processDocumentCountStats(totalHitsResp?.rawResponse, searchParams);
      const totalCount = totalHitsStats?.totalCount ?? 0;

      if (randomSampler) {
        randomSampler.setDocCount(totalCount);
      }
      const randomSamplerWrapper = randomSampler
        ? randomSampler.createRandomSamplerWrapper()
        : createRandomSamplerWrapper({
            totalNumDocs: totalCount,
            seed: RANDOM_SAMPLER_SEED,
          });

      const resp = await lastValueFrom(
        data.search.search(
          {
            params: getDocumentCountStatsRequest(
              { ...searchParams, trackTotalHits: false },
              randomSamplerWrapper
            ),
          },
          { abortSignal: abortCtrl.current.signal }
        )
      );

      const documentCountStats = processDocumentCountStats(
        resp?.rawResponse,
        searchParams,
        randomSamplerWrapper
      );

      const newStats: DocumentStats = {
        sampleProbability: randomSamplerWrapper.probability,
        documentCountStats,
        totalCount,
      };

      setDocumentStatsCache({
        ...documentStatsCache,
        [cacheKey]: newStats,
      });
    } catch (error) {
      // An `AbortError` gets triggered when a user cancels a request by navigating away, we need to ignore these errors.
      if (error.name !== 'AbortError') {
        displayError(toasts, searchParams!.index, extractErrorProperties(error));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.search, documentStatsCache, searchParams, toasts, samplingProbability]);

  useEffect(
    function getDocumentCountData() {
      fetchDocumentCountData();
      return () => abortCtrl.current.abort();
    },
    [fetchDocumentCountData, lastRefresh, samplingProbability]
  );

  // Clear the document count stats cache when the outer page (date picker/search bar) triggers a refresh.
  useEffect(() => {
    setDocumentStatsCache({});
  }, [lastRefresh]);

  return documentStats;
}
