/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { useCallback } from 'react';
import { Observable } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { LogEntryAfterCursor } from '../../../../common/log_entry';
import { LogViewColumnConfiguration } from '../../../../common/log_views';
import { decodeOrThrow } from '../../../../common/runtime_types';
import {
  logEntriesSearchRequestParamsRT,
  LogEntriesSearchRequestQuery,
  LogEntriesSearchResponsePayload,
  logEntriesSearchResponsePayloadRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import {
  flattenDataSearchResponseDescriptor,
  normalizeDataSearchResponses,
  ParsedDataSearchRequestDescriptor,
  useDataSearch,
  useDataSearchResponseState,
} from '../../../utils/data_search';
import { useOperator } from '../../../utils/use_observable';

export const useLogEntriesAfterRequest = ({
  columnOverrides,
  endTimestamp,
  highlightPhrase,
  query,
  sourceId,
  startTimestamp,
}: {
  columnOverrides?: LogViewColumnConfiguration[];
  endTimestamp: number;
  highlightPhrase?: string;
  query?: LogEntriesSearchRequestQuery;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { search: fetchLogEntriesAfter, requests$: logEntriesAfterSearchRequests$ } = useDataSearch(
    {
      getRequest: useCallback(
        (cursor: LogEntryAfterCursor['after'], params: { size: number; extendTo?: number }) => {
          return !!sourceId
            ? {
                request: {
                  params: logEntriesSearchRequestParamsRT.encode({
                    after: cursor,
                    columns: columnOverrides,
                    endTimestamp: params?.extendTo ?? endTimestamp,
                    highlightPhrase,
                    query: query as JsonObject,
                    size: params.size,
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
      parseResponses: parseLogEntriesAfterSearchResponses,
    }
  );

  return {
    fetchLogEntriesAfter,
    logEntriesAfterSearchRequests$,
  };
};

export const useLogEntriesAfterResponse = <Request extends IKibanaSearchRequest>(
  logEntriesAfterSearchRequests$: Observable<
    ParsedDataSearchRequestDescriptor<Request, LogEntriesSearchResponsePayload['data'] | null>
  >
) => {
  const logEntriesAfterSearchResponse$ = useOperator(
    logEntriesAfterSearchRequests$,
    flattenLogEntriesAfterSearchResponse
  );

  const { cancelRequest, isRequestRunning, isResponsePartial, loaded, total } =
    useDataSearchResponseState(logEntriesAfterSearchResponse$);

  return {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesAfterSearchRequests$,
    logEntriesAfterSearchResponse$,
    total,
  };
};

export const useFetchLogEntriesAfter = ({
  columnOverrides,
  endTimestamp,
  highlightPhrase,
  query,
  sourceId,
  startTimestamp,
}: {
  columnOverrides?: LogViewColumnConfiguration[];
  endTimestamp: number;
  highlightPhrase?: string;
  query?: LogEntriesSearchRequestQuery;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { fetchLogEntriesAfter, logEntriesAfterSearchRequests$ } = useLogEntriesAfterRequest({
    columnOverrides,
    endTimestamp,
    highlightPhrase,
    query,
    sourceId,
    startTimestamp,
  });

  const {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesAfterSearchResponse$,
    total,
  } = useLogEntriesAfterResponse(logEntriesAfterSearchRequests$);

  return {
    cancelRequest,
    fetchLogEntriesAfter,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesAfterSearchResponse$,
    total,
  };
};

export const parseLogEntriesAfterSearchResponses = normalizeDataSearchResponses(
  null,
  decodeOrThrow(logEntriesSearchResponsePayloadRT)
);

const flattenLogEntriesAfterSearchResponse = exhaustMap(flattenDataSearchResponseDescriptor);
