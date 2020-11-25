/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  logEntrySearchRequestParamsRT,
  logEntrySearchResponsePayloadRT,
  LOG_ENTRY_SEARCH_STRATEGY,
} from '../../../common/search_strategies/log_entries/log_entry';
import {
  useDataSearch,
  useLatestPartialDataSearchRequest,
} from '../../utils/use_data_search_request';

export const useLogEntry = ({
  sourceId,
  logEntryId,
}: {
  sourceId: string | null;
  logEntryId: string | null;
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
  });

  const {
    latestResponseData,
    latestResponseErrors,
    isPartial,
    isRunning,
    loaded,
    total,
  } = useLatestPartialDataSearchRequest(
    logEntrySearchRequests$,
    null,
    decodeLogEntrySearchResponse
  );

  return {
    fetchLogEntry,
    logEntry: latestResponseData ?? null,
    errors: latestResponseErrors,
    isRunning,
    isPartial,
    loaded,
    total,
  };
};

const decodeLogEntrySearchResponse = decodeOrThrow(logEntrySearchResponsePayloadRT);
