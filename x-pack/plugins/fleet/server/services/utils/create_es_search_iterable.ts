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
  searchRequest: Omit<SearchRequest, 'search_after' | 'from' | 'sort' | 'pit' | 'index'> &
    Pick<Required<SearchRequest>, 'sort' | 'index'>;
  /**
   * An optional callback for mapping the results retrieved from ES. If defined, the iterator
   * `value` will be set to the data returned by this mapping function.
   *
   * @param data
   */
  resultsMapper?: (data: SearchResponse<TDocument>) => any;
  /** If a Point in Time should be used while executing the search. Defaults to `true` */
  usePointInTime?: boolean;
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
  searchRequest: { size = 1000, index, ...searchOptions },
  resultsMapper,
  usePointInTime = true,
}: CreateEsSearchIterableOptions<TDocument>): AsyncIterable<
  InferEsSearchIteratorResultValue<TDocument>
> => {
  const keepAliveValue = '5m';
  let done = false;
  let value: SearchResponse<TDocument>;
  let searchAfterValue: estypes.SearchHit['sort'] | undefined;
  let pointInTime: Promise<{ id: string }> = usePointInTime
    ? esClient.openPointInTime({
        index,
        ignore_unavailable: true,
        keep_alive: keepAliveValue,
      })
    : Promise.resolve({ id: '' });

  const createIteratorResult = (): IteratorResult<SearchResponse<TDocument>> => {
    return { done, value };
  };

  const setValue = (searchResponse: SearchResponse<TDocument>): void => {
    value = resultsMapper ? resultsMapper(searchResponse) : searchResponse;
  };

  const setDone = async (): Promise<void> => {
    done = true;

    if (usePointInTime) {
      const pitId = (await pointInTime).id;

      if (pitId) {
        await esClient.closePointInTime({ id: pitId });
      }
    }
  };

  const fetchData = async () => {
    const pitId = (await pointInTime).id;

    const searchResult = await esClient
      .search<TDocument>({
        ...searchOptions,
        size,
        ...(usePointInTime
          ? {
              pit: {
                id: pitId,
                keep_alive: keepAliveValue,
              },
            }
          : { index }),
        search_after: searchAfterValue,
      })
      .catch((e) => {
        Error.captureStackTrace(e);
        throw e;
      });

    const searchHits = searchResult.hits.hits;
    const lastSearchHit = searchHits[searchHits.length - 1];

    if (searchHits.length === 0) {
      await setDone();
      return;
    }

    searchAfterValue = lastSearchHit.sort;
    pointInTime = Promise.resolve({ id: searchResult.pit_id ?? '' });
    setValue(searchResult);

    // If (for some reason) we don't have a `searchAfterValue`,
    // then throw an error, or else we'll keep looping forever
    if (!searchAfterValue) {
      await setDone();
      throw new Error(
        `Unable to store 'search_after' value. Last 'SearchHit' did not include a 'sort' property \n(did you forget to set the 'sort' attribute on your SearchRequest?)':\n${JSON.stringify(
          lastSearchHit
        )}`
      );
    }
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
