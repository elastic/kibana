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

      const { id, response: rawResponse } = esSearchResponse;
      const { total, failed, skipped, successful } = rawResponse._shards;
      const loaded = failed + skipped + successful;
      return { id, total, loaded, rawResponse };
    },
    cancel: id => {
      caller('transport.request', {
        path: `/_async_search/${id}`,
        method: 'DELETE',
      });
    },
  };
};
