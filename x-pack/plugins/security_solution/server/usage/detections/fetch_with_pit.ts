/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OpenPointInTimeResponse,
  SearchHit,
  SortResults,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from 'kibana/server';

export interface FetchWithPitOptions {
  esClient: ElasticsearchClient;
  index: string;
  maxSize: number;
  maxPerPage: number;
  searchRequest: SearchRequest;
}
export const fetchWithPit = async <T>({
  esClient,
  index,
  searchRequest,
  maxSize,
  maxPerPage,
}: FetchWithPitOptions): Promise<Array<SearchHit<T>>> => {
  // create and assign an initial point in time
  let pitId: OpenPointInTimeResponse['id'] = (
    await esClient.openPointInTime({
      index,
      keep_alive: '5m', // default is from looking at Kibana saved objects and online documentation
    })
  ).body.id;

  let searchAfter: SortResults | undefined;
  let hits: Array<SearchHit<T>> = [];
  let fetchMore = true;
  while (fetchMore) {
    const ruleSearchOptions: SearchRequest = {
      ...searchRequest,
      search_after: searchAfter,
      sort: [{ _shard_doc: 'desc' }] as unknown as string[], // FUNFACT: This is not typed correctly https://github.com/elastic/elasticsearch-js/issues/1589
      pit: { id: pitId },
      size: Math.min(maxPerPage, maxSize - hits.length),
    };
    const { body } = await esClient.search<T>(ruleSearchOptions);
    hits = [...hits, ...body.hits.hits];
    searchAfter =
      body.hits.hits.length !== 0 ? body.hits.hits[body.hits.hits.length - 1].sort : undefined;

    fetchMore = searchAfter != null && hits.length <= maxSize;
    if (body.pit_id != null) {
      pitId = body.pit_id;
    }
  }
  esClient.closePointInTime({ id: pitId });
  return hits;
};
