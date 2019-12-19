/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ES_SEARCH_STRATEGY } from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  ISearchContext,
  TSearchStrategyProvider,
} from '../../../../../../src/plugins/data/public';

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext,
  caller: APICaller
): ISearchStrategy<typeof ES_SEARCH_STRATEGY> => {
  return {
    search: async (request, options) => {
      // If we have an ID, then just poll for that ID, otherwise send the entire request body
      const args = [
        'transport.request',
        request.id
          ? {
              path: `_async_search/${request.id}`,
              method: 'GET',
            }
          : {
              path: `${request.params.index}/_async_search`,
              method: 'POST',
              ...request.params,
            },
        options,
      ];

      const esSearchResponse = (await caller(...args)) as SearchResponse<any>;

      // TODO: This can be simplified once the async API is updated
      const { id, response: rawResponse } = esSearchResponse;
      const failed = rawResponse._shards?.failed ?? rawResponse.shard_failures;
      const total = rawResponse._shards?.total ?? rawResponse.total_shards;
      const successful = rawResponse._shards?.successful ?? rawResponse.successful_shards;
      const skipped = rawResponse._shards?.skipped ?? 0;
      const loaded = failed + successful + skipped;
      return { id, total, loaded, rawResponse };
    },
  };
};
