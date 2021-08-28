/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JsonObject } from '@kbn/utility-types';
import { useCallback } from 'react';
import { Observable } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import type { IKibanaSearchRequest } from '../../../../../../../src/plugins/data/common/search/types';
import type { LogEntryBeforeCursor } from '../../../../common/log_entry/log_entry_cursor';
import type { LogSourceColumnConfiguration } from '../../../../common/log_sources/log_source_configuration';
import { decodeOrThrow } from '../../../../common/runtime_types';
import type {
  LogEntriesSearchRequestQuery,
  LogEntriesSearchResponsePayload,
} from '../../../../common/search_strategies/log_entries/log_entries';
import {
  logEntriesSearchRequestParamsRT,
  logEntriesSearchResponsePayloadRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { flattenDataSearchResponseDescriptor } from '../../../utils/data_search/flatten_data_search_response';
import { normalizeDataSearchResponses } from '../../../utils/data_search/normalize_data_search_responses';
import type { ParsedDataSearchRequestDescriptor } from '../../../utils/data_search/types';
import { useDataSearch } from '../../../utils/data_search/use_data_search_request';
import { useDataSearchResponseState } from '../../../utils/data_search/use_data_search_response_state';
import { useOperator } from '../../../utils/use_observable';

export const useLogEntriesBeforeRequest = ({
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
  query?: LogEntriesSearchRequestQuery;
  sourceId: string;
  startTimestamp: number;
}) => {
  const {
    search: fetchLogEntriesBefore,
    requests$: logEntriesBeforeSearchRequests$,
  } = useDataSearch({
    getRequest: useCallback(
      (cursor: LogEntryBeforeCursor['before'], params: { size: number; extendTo?: number }) => {
        return !!sourceId
          ? {
              request: {
                params: logEntriesSearchRequestParamsRT.encode({
                  before: cursor,
                  columns: columnOverrides,
                  endTimestamp,
                  highlightPhrase,
                  query: query as JsonObject,
                  size: params.size,
                  sourceId,
                  startTimestamp: params.extendTo ?? startTimestamp,
                }),
              },
              options: { strategy: LOG_ENTRIES_SEARCH_STRATEGY },
            }
          : null;
      },
      [columnOverrides, endTimestamp, highlightPhrase, query, sourceId, startTimestamp]
    ),
    parseResponses: parseLogEntriesBeforeSearchResponses,
  });

  return {
    fetchLogEntriesBefore,
    logEntriesBeforeSearchRequests$,
  };
};

export const useLogEntriesBeforeResponse = <Request extends IKibanaSearchRequest>(
  logEntriesBeforeSearchRequests$: Observable<
    ParsedDataSearchRequestDescriptor<Request, LogEntriesSearchResponsePayload['data'] | null>
  >
) => {
  const logEntriesBeforeSearchResponse$ = useOperator(
    logEntriesBeforeSearchRequests$,
    flattenLogEntriesBeforeSearchResponse
  );

  const {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    loaded,
    total,
  } = useDataSearchResponseState(logEntriesBeforeSearchResponse$);

  return {
    cancelRequest,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesBeforeSearchRequests$,
    logEntriesBeforeSearchResponse$,
    total,
  };
};

export const useFetchLogEntriesBefore = ({
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
  query?: LogEntriesSearchRequestQuery;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { fetchLogEntriesBefore, logEntriesBeforeSearchRequests$ } = useLogEntriesBeforeRequest({
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
    logEntriesBeforeSearchResponse$,
    total,
  } = useLogEntriesBeforeResponse(logEntriesBeforeSearchRequests$);

  return {
    cancelRequest,
    fetchLogEntriesBefore,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesBeforeSearchResponse$,
    total,
  };
};

export const parseLogEntriesBeforeSearchResponses = normalizeDataSearchResponses(
  null,
  decodeOrThrow(logEntriesSearchResponsePayloadRT)
);

const flattenLogEntriesBeforeSearchResponse = exhaustMap(flattenDataSearchResponseDescriptor);
