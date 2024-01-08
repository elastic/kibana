/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';

export interface CreateSoFindIterableOptions<TDocument = unknown> {
  soClient: SavedObjectsClientContract;
  findRequest: Omit<SavedObjectsFindOptions, 'searchAfter' | 'page' | 'sortField'> &
    // sortField is required
    Pick<Required<SavedObjectsFindOptions>, 'sortField'>;
  /**
   * An optional callback for mapping the results retrieved from SavedObjects. If defined, the iterator
   * `value` will be set to the data returned by this mapping function.
   *
   * @param data
   */
  resultsMapper?: (data: SavedObjectsFindResponse<TDocument>) => any;
}

export type InferSoFindIteratorResultValue<TDocument = unknown> =
  CreateSoFindIterableOptions<TDocument>['resultsMapper'] extends undefined
    ? SavedObjectsFindResponse<TDocument>
    : ReturnType<Required<CreateSoFindIterableOptions<TDocument>>['resultsMapper']>;

/**
 * Creates an `AsyncIterable` that can be used to iterate (ex. via `for..await..of`) over all the data
 * matching the search query. The search request to Saved Object will use `searchAfter`, thus can iterate over
 * datasets above 10k items as well.
 *
 * @param options
 */
export const createSoFindIterable = <TDocument = unknown>({
  soClient,
  findRequest: { perPage = 1000, ...findOptions },
  resultsMapper,
}: CreateSoFindIterableOptions<TDocument>): AsyncIterable<
  InferSoFindIteratorResultValue<TDocument>
> => {
  let done = false;
  let value: SavedObjectsFindResponse<TDocument>;
  let searchAfterValue: SavedObjectsFindResult['sort'] | undefined;

  // FIXME:PT should use PIT for the query. Look into adding it.

  const fetchData = async () => {
    const findResult = await soClient
      .find<TDocument>({
        ...findOptions,
        perPage,
        searchAfter: searchAfterValue,
      })
      .catch((e) => {
        Error.captureStackTrace(e);
        throw e;
      });

    value = resultsMapper ? resultsMapper(findResult) : findResult;

    const soItems = findResult.saved_objects;

    if (soItems.length === 0) {
      done = true;
      return;
    }

    const lastSearchHit = soItems[soItems.length - 1];
    searchAfterValue = lastSearchHit.sort;

    // If (for some reason) we don't have a `searchAfterValue`,
    // then throw an error, or else we'll keep looping forever
    if (!searchAfterValue) {
      done = true;
      throw new Error(
        `Unable to store 'searchAfter' value. Last 'SavedObjectsFindResult' did not include a 'sort' property \n(did you forget to set the 'sortField' attribute on your SavedObjectsFindOptions?)':\n${JSON.stringify(
          lastSearchHit
        )}`
      );
    }
  };

  const createIteratorResult = (): IteratorResult<SavedObjectsFindResponse<TDocument>> => {
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
