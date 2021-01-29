/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntryCursorRT, logEntryRT } from '../../log_entry';
import {
  logEntriesBaseRequestRT,
  logEntriesBeforeRequestRT,
  logEntriesAfterRequestRT,
  logEntriesCenteredRequestRT,
} from './entries';

export const LOG_ENTRIES_HIGHLIGHTS_PATH = '/api/log_entries/highlights';

const highlightsRT = rt.type({
  highlightTerms: rt.array(rt.string),
});

export const logEntriesHighlightsBaseRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  highlightsRT,
]);

export const logEntriesHighlightsBeforeRequestRT = rt.intersection([
  logEntriesBeforeRequestRT,
  highlightsRT,
]);

export const logEntriesHighlightsAfterRequestRT = rt.intersection([
  logEntriesAfterRequestRT,
  highlightsRT,
]);

export const logEntriesHighlightsCenteredRequestRT = rt.intersection([
  logEntriesCenteredRequestRT,
  highlightsRT,
]);

export const logEntriesHighlightsRequestRT = rt.union([
  logEntriesHighlightsBaseRequestRT,
  logEntriesHighlightsBeforeRequestRT,
  logEntriesHighlightsAfterRequestRT,
  logEntriesHighlightsCenteredRequestRT,
]);

export type LogEntriesHighlightsRequest = rt.TypeOf<typeof logEntriesHighlightsRequestRT>;

export const logEntriesHighlightsResponseRT = rt.type({
  data: rt.array(
    rt.union([
      rt.type({
        topCursor: rt.null,
        bottomCursor: rt.null,
        entries: rt.array(logEntryRT),
      }),
      rt.type({
        topCursor: logEntryCursorRT,
        bottomCursor: logEntryCursorRT,
        entries: rt.array(logEntryRT),
      }),
    ])
  ),
});

export type LogEntriesHighlightsResponse = rt.TypeOf<typeof logEntriesHighlightsResponseRT>;
