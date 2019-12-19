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
      const { index, ...params } = request.params;

      const esSearchResponse = (await caller(
        'transport.request',
        {
          path: `${index}/_async_search`,
          method: 'POST',
          ...params,
        },
        options
      )) as SearchResponse<any>;

      const { id, response: rawResponse } = esSearchResponse;
      const {
        _shards: { total, successful, skipped, failed },
      } = rawResponse;
      const loaded = failed + skipped + successful;
      return { id, total, loaded, rawResponse };
    },
  };
};
