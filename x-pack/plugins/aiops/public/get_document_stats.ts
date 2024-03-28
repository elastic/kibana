/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import dateMath from '@kbn/datemath';
import { getExtendedChangePoint, type DocumentCountStatsChangePoint } from '@kbn/aiops-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { Query } from '@kbn/es-query';
import type { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { buildExtendedBaseFilterCriteria } from './application/utils/build_extended_base_filter_criteria';
import type { GroupTableItem } from './components/log_rate_analysis_results_table/types';

export interface DocumentCountStats {
  interval?: number;
  buckets?: { [key: string]: number };
  changePoint?: DocumentCountStatsChangePoint;
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  totalCount: number;
  lastDocTimeStampMs?: number;
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
  selectedGroup?: GroupTableItem | null;
  trackTotalHits?: boolean;
}

export const getDocumentCountStatsRequest = (
  params: DocumentStatsSearchStrategyParams,
  randomSamplerWrapper?: RandomSamplerWrapper,
  skipAggs = false,
  changePoints = false
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
    selectedSignificantItem,
    includeSelectedSignificantItem,
    selectedGroup,
    trackTotalHits,
  } = params;

  const filterCriteria = buildExtendedBaseFilterCriteria(
    timeFieldName,
    earliestMs,
    latestMs,
    searchQuery,
    selectedSignificantItem,
    includeSelectedSignificantItem,
    selectedGroup
  );

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
    ...(changePoints
      ? {
          change_point_request: {
            // @ts-expect-error missing from ES spec
            change_point: {
              buckets_path: 'eventRate>_count',
            },
          },
        }
      : {}),
  };

  const aggs = randomSamplerWrapper ? randomSamplerWrapper.wrap(rawAggs) : rawAggs;

  const searchBody: estypes.MsearchMultisearchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    track_total_hits: trackTotalHits === true,
    size: 0,
  };

  if (isPopulatedObject(runtimeFieldMap)) {
    searchBody.runtime_mappings = runtimeFieldMap;
  }

  if (
    !fieldsToFetch &&
    !skipAggs &&
    timeFieldName !== undefined &&
    intervalMs !== undefined &&
    intervalMs > 0
  ) {
    searchBody.aggs = aggs;
    searchBody.sort = { [timeFieldName]: 'desc' };
    searchBody.fields = [timeFieldName];
    searchBody.size = 1;
  }

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

  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    randomSamplerWrapper && body.aggregations !== undefined
      ? randomSamplerWrapper.unwrap(body.aggregations)
      : body.aggregations,
    ['eventRate', 'buckets'],
    []
  );

  const changePointRaw = get(
    randomSamplerWrapper && body.aggregations !== undefined
      ? randomSamplerWrapper.unwrap(body.aggregations)
      : body.aggregations,
    ['change_point_request']
  );

  const changePointBase =
    changePointRaw && changePointRaw.bucket && Object.keys(changePointRaw.type).length > 0
      ? { key: Date.parse(changePointRaw.bucket.key), type: Object.keys(changePointRaw.type)[0] }
      : undefined;

  const buckets = dataByTimeBucket.reduce<Record<string, number>>((acc, cur) => {
    acc[cur.key] = cur.doc_count;
    return acc;
  }, {});

  const lastDocTimeStamp: string = Object.values(body.hits.hits[0]?.fields ?? [[]])[0][0];
  const lastDocTimeStampMs =
    lastDocTimeStamp === undefined ? undefined : dateMath.parse(lastDocTimeStamp)?.valueOf();

  return {
    interval: params.intervalMs,
    buckets,
    timeRangeEarliest: params.earliest,
    timeRangeLatest: params.latest,
    totalCount,
    lastDocTimeStampMs,
    ...(changePointBase
      ? {
          changePoint: {
            ...changePointBase,
            ...getExtendedChangePoint(buckets, changePointBase?.key),
          },
        }
      : {}),
  };
};
