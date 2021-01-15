/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import {
  logEntriesSearchRequestParamsRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { useDataSearch } from '../../../utils/data_search';

export const useFetchLogEntriesAround = ({
  endTimestamp,
  sourceId,
  startTimestamp,
}: {
  endTimestamp: number;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { search: fetchLogEntry, requests$: logEntrySearchRequests$ } = useDataSearch({
    getRequest: useCallback(
      (size: number) => {
        return !!sourceId
          ? {
              request: {
                params: logEntriesSearchRequestParamsRT.encode({
                  endTimestamp,
                  size,
                  sourceId,
                  startTimestamp,
                }),
              },
              options: { strategy: LOG_ENTRIES_SEARCH_STRATEGY },
            }
          : null;
      },
      [endTimestamp, sourceId, startTimestamp]
    ),
  });

  return {
    fetchLogEntry,
    logEntrySearchRequests$,
  };
};
