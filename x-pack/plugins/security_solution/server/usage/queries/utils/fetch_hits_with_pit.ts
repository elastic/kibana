/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OpenPointInTimeResponse,
  SearchHit,
  SortResults,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface FetchWithPitOptions {
  esClient: ElasticsearchClient;
  index: string;
  maxSize: number;
  maxPerPage: number;
  searchRequest: SearchRequest;
  logger: Logger;
}

export const fetchHitsWithPit = async <T>({
  esClient,
  index,
  searchRequest,
  maxSize,
  maxPerPage,
  logger,
}: FetchWithPitOptions): Promise<Array<SearchHit<T>>> => {
  // default is from looking at Kibana saved objects and online documentation
  const keepAlive = '5m';

  // create and assign an initial point in time
  let pitId: OpenPointInTimeResponse['id'] = (
    await esClient.openPointInTime({
      index,
      keep_alive: '5m',
    })
  ).id;

  let searchAfter: SortResults | undefined;
  let hits: Array<SearchHit<T>> = [];
  let fetchMore = true;
  while (fetchMore) {
    const ruleSearchOptions: SearchRequest = {
      ...searchRequest,
      track_total_hits: false,
      search_after: searchAfter,
      sort: [{ _shard_doc: 'desc' }] as unknown as string[], // TODO: Remove this "unknown" once it is typed correctly https://github.com/elastic/elasticsearch-js/issues/1589
      pit: { id: pitId },
      size: Math.min(maxPerPage, maxSize - hits.length),
    };
    logger.debug(
      `Getting hits with point in time (PIT) query of: ${JSON.stringify(ruleSearchOptions)}`
    );
    const body = await esClient.search<T>(ruleSearchOptions);
    hits = [...hits, ...body.hits.hits];
    searchAfter =
      body.hits.hits.length !== 0 ? body.hits.hits[body.hits.hits.length - 1].sort : undefined;

    fetchMore = searchAfter != null && body.hits.hits.length > 0 && hits.length < maxSize;
    if (body.pit_id != null) {
      pitId = body.pit_id;
    }
  }
  try {
    await esClient.closePointInTime({ id: pitId });
  } catch (error) {
    // Don't fail due to a bad point in time closure. We have seen failures in e2e tests during nominal operations.
    logger.warn(
      `Error trying to close point in time: "${pitId}", it will expire within "${keepAlive}". Error is: "${error}"`
    );
  }
  logger.debug(`Returning hits with point in time (PIT) length of: ${hits.length}`);
  return hits;
};
