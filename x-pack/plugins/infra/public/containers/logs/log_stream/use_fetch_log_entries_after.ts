/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { LogSourceColumnConfiguration } from '../../../../common/http_api/log_sources';
import {
  logEntriesSearchRequestParamsRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { JsonObject } from '../../../../common/typed_json';
import { useDataSearch } from '../../../utils/data_search';

export const useFetchLogEntriesAfter = ({
  columnOverrides,
  endTimestamp,
  highlightPhrase,
  query,
  sourceId,
  startTimestamp,
}: {
  columnOverrides?: LogSourceColumnConfiguration[];
  endTimestamp: number;
  highlightPhrase?: string;
  query?: JsonObject;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { search: fetchLogEntriesAfter, requests$: logEntriesAfterSearchRequests$ } = useDataSearch(
    {
      getRequest: useCallback(
        (size: number) => {
          return !!sourceId
            ? {
                request: {
                  params: logEntriesSearchRequestParamsRT.encode({
                    columns: columnOverrides,
                    endTimestamp,
                    highlightPhrase,
                    query,
                    size,
                    sourceId,
                    startTimestamp,
                  }),
                },
                options: { strategy: LOG_ENTRIES_SEARCH_STRATEGY },
              }
            : null;
        },
        [columnOverrides, endTimestamp, highlightPhrase, query, sourceId, startTimestamp]
      ),
    }
  );

  return {
    fetchLogEntriesAfter,
    logEntriesAfterSearchRequests$,
  };
};
