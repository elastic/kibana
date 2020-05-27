/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSearchStrategyProvider } from 'src/plugins/data/server';
import {
  logEntriesRequestRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
  logEntriesResponseRT,
} from '../../../../common/log_entries';
import { decodeOrThrow } from '../../../../common/runtime_types';

export const logEntriesSearchStrategyProvider: TSearchStrategyProvider<typeof LOG_ENTRIES_SEARCH_STRATEGY> = ({
  data,
  logSources,
}) => ({
  search: async (request) => {
    const payload = decodeOrThrow(logEntriesRequestRT)(request);

    // something using data.search.search and payload
    const { firstTotal, firstLoaded, firstResults } = await somethingThatCallsAnotherSearchStrategy(
      payload
    );

    // something using data.search.search and the first results
    const {
      secondTotal,
      secondLoaded,
      secondResults,
    } = await somethingThatCallsAnotherSearchStrategy(firstResults);

    const total = mergeTotalsSomehow(firstTotal, secondTotal);
    const loaded = mergeLoadedSomehow(firstLoaded, secondLoaded);

    return {
      id,
      total,
      loaded,
      ...logEntriesResponseRT.encode({
        // something using the results
      }),
    };
  },
  cancel: async (id) => {
    // signal cancellation to the search function somehow
  },
});
