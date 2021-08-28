/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  logEntrySearchRequestParamsRT,
  logEntrySearchResponsePayloadRT,
  LOG_ENTRY_SEARCH_STRATEGY,
} from '../../../common/search_strategies/log_entries/log_entry';
import { normalizeDataSearchResponses } from '../../utils/data_search/normalize_data_search_responses';
import { useDataSearch } from '../../utils/data_search/use_data_search_request';
import { useLatestPartialDataSearchResponse } from '../../utils/data_search/use_latest_partial_data_search_response';

export const useLogEntry = ({
  sourceId,
  logEntryId,
}: {
  sourceId: string | null | undefined;
  logEntryId: string | null | undefined;
}) => {
  const { search: fetchLogEntry, requests$: logEntrySearchRequests$ } = useDataSearch({
    getRequest: useCallback(() => {
      return !!logEntryId && !!sourceId
        ? {
            request: {
              params: logEntrySearchRequestParamsRT.encode({ sourceId, logEntryId }),
            },
            options: { strategy: LOG_ENTRY_SEARCH_STRATEGY },
          }
        : null;
    }, [sourceId, logEntryId]),
    parseResponses: parseLogEntrySearchResponses,
  });

  const {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    latestResponseData,
    latestResponseErrors,
    loaded,
    total,
  } = useLatestPartialDataSearchResponse(logEntrySearchRequests$);

  return {
    cancelRequest,
    errors: latestResponseErrors,
    fetchLogEntry,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntry: latestResponseData ?? null,
    total,
  };
};

const parseLogEntrySearchResponses = normalizeDataSearchResponses(
  null,
  decodeOrThrow(logEntrySearchResponsePayloadRT)
);
