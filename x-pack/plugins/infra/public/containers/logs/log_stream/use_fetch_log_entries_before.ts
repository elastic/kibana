/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { exhaustMap, map } from 'rxjs/operators';
import { LogSourceColumnConfiguration } from '../../../../common/http_api/log_sources';
import { LogEntryCursor } from '../../../../common/log_entry';
import { decodeOrThrow } from '../../../../common/runtime_types';
import {
  logEntriesSearchRequestParamsRT,
  logEntriesSearchResponsePayloadRT,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { JsonObject } from '../../../../common/typed_json';
import {
  flattenDataSearchResponseDescriptor,
  parseDataSearchResponses,
  useDataSearch,
  useDataSearchResponseState,
} from '../../../utils/data_search';
import { useOperator } from '../../../utils/use_observable';

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
  query?: JsonObject;
  sourceId: string;
  startTimestamp: number;
}) => {
  const {
    search: fetchLogEntriesBefore,
    requests$: rawLogEntriesBeforeSearchRequests$,
  } = useDataSearch({
    getRequest: useCallback(
      (cursor: LogEntryCursor, size: number) => {
        return !!sourceId
          ? {
              request: {
                params: logEntriesSearchRequestParamsRT.encode({
                  before: cursor,
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
  });

  const logEntriesBeforeSearchRequests$ = useOperator(
    rawLogEntriesBeforeSearchRequests$,
    parseLogEntriesSearchResponses
  );
  const logEntriesBeforeSearchResponse$ = useOperator(
    logEntriesBeforeSearchRequests$,
    flattenLogEntriesSearchResponse
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
    fetchLogEntriesBefore,
    isRequestRunning,
    isResponsePartial,
    loaded,
    logEntriesBeforeSearchResponse$,
    total,
  };
};

const parseLogEntriesSearchResponses = map(
  parseDataSearchResponses(null, decodeOrThrow(logEntriesSearchResponsePayloadRT))
);

const flattenLogEntriesSearchResponse = exhaustMap(flattenDataSearchResponseDescriptor);
