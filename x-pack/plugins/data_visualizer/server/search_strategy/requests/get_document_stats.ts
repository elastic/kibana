/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { each, get } from 'lodash';
import { FieldStatsCommonRequestParams } from '../../../common/search_strategy/types';
import { buildBaseFilterCriteria } from '../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../common/utils/object_utils';
import { DocumentCountStats } from '../../types';

export const getDocumentCountStatsRequest = (params: FieldStatsCommonRequestParams) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap, intervalMs } = params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

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

export const fetchDocumentCountStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams
): Promise<DocumentCountStats> => {
  const { intervalMs } = params;
  const request: SearchRequest = getDocumentCountStatsRequest(params);

  const { body } = await esClient.search(request);

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
    documentCounts: {
      interval: intervalMs,
      buckets,
    },
  };
};
