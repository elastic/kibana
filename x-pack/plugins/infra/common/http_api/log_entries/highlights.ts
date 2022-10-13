/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { logEntryCursorRT, logEntryRT } from '../../log_entry';
import { logViewColumnConfigurationRT } from '../../log_views';

export const LOG_ENTRIES_HIGHLIGHTS_PATH = '/api/log_entries/highlights';

export const logEntriesHighlightsBaseRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startTimestamp: rt.number,
    endTimestamp: rt.number,
    highlightTerms: rt.array(rt.string),
  }),
  rt.partial({
    query: rt.union([rt.string, rt.null]),
    size: rt.number,
    columns: rt.array(logViewColumnConfigurationRT),
  }),
]);

export const logEntriesHighlightsBeforeRequestRT = rt.intersection([
  logEntriesHighlightsBaseRequestRT,
  rt.type({ before: rt.union([logEntryCursorRT, rt.literal('last')]) }),
]);

export const logEntriesHighlightsAfterRequestRT = rt.intersection([
  logEntriesHighlightsBaseRequestRT,
  rt.type({ after: rt.union([logEntryCursorRT, rt.literal('first')]) }),
]);

export const logEntriesHighlightsCenteredRequestRT = rt.intersection([
  logEntriesHighlightsBaseRequestRT,
  rt.type({ center: logEntryCursorRT }),
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
