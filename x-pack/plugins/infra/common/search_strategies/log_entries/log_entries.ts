/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logSourceColumnConfigurationRT } from '../../http_api/log_sources';
import {
  logEntryAfterCursorRT,
  // logEntryAroundCursorRT,
  logEntryBeforeCursorRT,
  logEntryCursorRT,
  logEntryRT,
} from '../../log_entry';
import { jsonObjectRT } from '../../typed_json';
import { searchStrategyErrorRT } from '../common/errors';

export const LOG_ENTRIES_SEARCH_STRATEGY = 'infra-log-entries';

const logEntriesBaseSearchRequestParamsRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startTimestamp: rt.number,
    endTimestamp: rt.number,
    size: rt.number,
  }),
  rt.partial({
    query: jsonObjectRT,
    columns: rt.array(logSourceColumnConfigurationRT),
    highlightPhrase: rt.string,
  }),
]);

export const logEntriesBeforeSearchRequestParamsRT = rt.intersection([
  logEntriesBaseSearchRequestParamsRT,
  logEntryBeforeCursorRT,
]);

export const logEntriesAfterSearchRequestParamsRT = rt.intersection([
  logEntriesBaseSearchRequestParamsRT,
  logEntryAfterCursorRT,
]);

// export const logEntriesCenteredSearchRequestParamsRT = rt.intersection([
//   logEntriesBaseSearchRequestParamsRT,
//   logEntryAroundCursorRT,
// ]);

export const logEntriesSearchRequestParamsRT = rt.union([
  logEntriesBaseSearchRequestParamsRT,
  logEntriesBeforeSearchRequestParamsRT,
  logEntriesAfterSearchRequestParamsRT,
  // logEntriesCenteredSearchRequestParamsRT,
]);

export type LogEntriesSearchRequestParams = rt.TypeOf<typeof logEntriesSearchRequestParamsRT>;

export const logEntriesSearchResponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.intersection([
      rt.type({
        entries: rt.array(logEntryRT),
        topCursor: rt.union([logEntryCursorRT, rt.null]),
        bottomCursor: rt.union([logEntryCursorRT, rt.null]),
      }),
      rt.partial({
        hasMoreBefore: rt.boolean,
        hasMoreAfter: rt.boolean,
      }),
    ]),
  }),
  rt.partial({
    errors: rt.array(searchStrategyErrorRT),
  }),
]);

export type LogEntriesSearchResponsePayload = rt.TypeOf<typeof logEntriesSearchResponsePayloadRT>;
