/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type * as estypes from '@kbn/es-types';

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export interface CreateEsSearchIterableOptions<TDocument = unknown> {
  esClient: ElasticsearchClient;
  searchRequest: Omit<SearchRequest, 'search_after' | 'from' | 'sort'> &
    Pick<Required<SearchRequest>, 'sort'>;
  /**
   * An optional callback for mapping the results retrieved from ES. If defined, the iterator
   * `value` will be set to the data returned by this mapping function.
   *
   * @param data
   */
  resultsMapper?: (data: SearchResponse<TDocument>) => any;
}

export type InferEsSearchIteratorResultValue<TDocument = unknown> =
  CreateEsSearchIterableOptions<TDocument>['resultsMapper'] extends undefined
    ? SearchResponse<TDocument>
    : ReturnType<Required<CreateEsSearchIterableOptions<TDocument>>['resultsMapper']>;

/**
 * Creates an `AsyncIterable` that can be used to iterate (ex. via `for..await..of`) over all the data
 * matching the search query. The search request to ES will use `search_after`, thus can iterate over
 * datasets above 10k items as well.
 *
 * @param options
 *
 * @example
 *
 *  const yourFn = async () => {
 *    const dataIterable = createEsSearchIterable({
 *      esClient,
 *      searchRequest: {
 *        index: 'some-index',
 *        sort: [
 *          {
 *            created: { order: 'asc' }
 *          }
 *        ]
 *      }
 *    });
 *
 *    for await (const data of dataIterable) {
 *      // data === your search results
 *    }
 *  }
 */
export const createEsSearchIterable = <TDocument = unknown>({
  esClient,
  searchRequest: { size = 1000, ...searchOptions },
  resultsMapper,
}: CreateEsSearchIterableOptions<TDocument>): AsyncIterable<
  InferEsSearchIteratorResultValue<TDocument>
> => {
  let done = false;
  let value: SearchResponse<TDocument>;

  let searchAfterValue: estypes.SearchHit['sort'] | undefined;

  // FIXME:PT should use PIT for the query. Look into adding it.

  const fetchData = async () => {
    const searchResult = await esClient
      .search<TDocument>({
        ...searchOptions,
        size,
        search_after: searchAfterValue,
      })
      .catch((e) => {
        Error.captureStackTrace(e);
        throw e;
      });

    const searchHits = searchResult.hits.hits;

    if (searchHits.length === 0) {
      done = true;
      return;
    }

    const lastSearchHit = searchHits[searchHits.length - 1];
    searchAfterValue = lastSearchHit.sort;

    // If (for some reason) we don't have a `searchAfterValue`,
    // then throw an error, or else we'll keep looping forever
    if (!searchAfterValue) {
      done = true;
      throw new Error(
        `Unable to store 'search_after' value. Last 'SearchHit' did not include a 'sort' property \n(did you forget to set the 'sort' attribute on your SearchRequest?)':\n${JSON.stringify(
          lastSearchHit
        )}`
      );
    }

    value = resultsMapper ? resultsMapper(searchResult) : searchResult;
  };

  const createIteratorResult = (): IteratorResult<SearchResponse<TDocument>> => {
    return { done, value };
  };

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (!done) {
            await fetchData();
          }

          return createIteratorResult();
        },

        async return() {
          done = true;
          return createIteratorResult();
        },
      };
    },
  };
};
