/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildBaseFilterCriteria } from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type {
  DocumentCountStats,
  OverallStatsSearchStrategyParams,
} from '../../../../../common/types/field_stats';

export const getDocumentCountStatsRequest = (params: OverallStatsSearchStrategyParams) => {
  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
  } = params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, searchQuery);

  // Don't use the sampler aggregation as this can lead to some potentially
  // confusing date histogram results depending on the date range of data amongst shards.

  const aggs = {
    eventRate: {
      date_histogram: {
        field: timeFieldName,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 1,
      },
    },
  };

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs,
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
  };
  return {
    index,
    size,
    body: searchBody,
  };
};

export const processDocumentCountStats = (
  body: estypes.SearchResponse | undefined,
  params: OverallStatsSearchStrategyParams
): DocumentCountStats | undefined => {
  if (
    !body ||
    params.intervalMs === undefined ||
    params.earliest === undefined ||
    params.latest === undefined
  ) {
    return undefined;
  }
  const buckets: { [key: string]: number } = {};
  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    body,
    ['aggregations', 'eventRate', 'buckets'],
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
  };
};
