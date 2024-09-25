/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchResponse, SortResults, SearchHit } from '@elastic/elasticsearch/lib/api/types';

export async function searchPaginateThroughSignals<TDocument>(
  {}: {},
  callback: (searchAfter?: SortResults) => Promise<Pick<SearchResponse<TDocument>, 'hits'>>
): Promise<{
  hits: Array<SearchHit<TDocument>>;
}> {
  async function getNextPage(searchAfter?: SortResults): Promise<Array<SearchHit<TDocument>>> {
    const response = await callback(searchAfter);
    const hits = response.hits.hits;
    if (!hits.length) {
      return [];
    }
    const last = hits[hits.length - 1];
    const nextSearchAfter = last.sort;

    if (!nextSearchAfter) {
      return hits;
    }

    return [...hits, ...(await getNextPage(last.sort))];
  }

  return {
    hits: await getNextPage(),
  };
}
