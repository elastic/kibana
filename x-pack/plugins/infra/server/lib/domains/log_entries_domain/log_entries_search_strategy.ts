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

    return logEntriesResponseRT.encode({
      data: {
        // results go here
      },
    });
  },
});
