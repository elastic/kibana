/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntriesCursorRT } from './common';

export const LOG_ENTRIES_PATH = '/api/log_entries/entries';

export const logEntriesBaseRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startDate: rt.number,
    endDate: rt.number,
  }),
  rt.partial({
    query: rt.string,
    size: rt.number,
  }),
]);

export const logEntriesBeforeRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ before: rt.union([logEntriesCursorRT, rt.literal('last')]) }),
]);

export const logEntriesAfterRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ after: rt.union([logEntriesCursorRT, rt.literal('first')]) }),
]);

export const logEntriesCenteredRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ center: logEntriesCursorRT }),
]);

export const logEntriesRequestRT = rt.union([
  logEntriesBaseRequestRT,
  logEntriesBeforeRequestRT,
  logEntriesAfterRequestRT,
  logEntriesCenteredRT,
]);

export type LogEntriesRequest = rt.TypeOf<typeof logEntriesRequestRT>;

// JSON value
const valueRT = rt.union([rt.string, rt.number, rt.boolean, rt.object, rt.null, rt.undefined]);

export const logMessagePartRT = rt.union([
  rt.type({
    constant: rt.string,
  }),
  rt.type({
    field: rt.string,
    value: valueRT,
    highlights: rt.array(rt.string),
  }),
]);

export const logColumnRT = rt.union([
  rt.type({ columnId: rt.string, timestamp: rt.number }),
  rt.type({
    columnId: rt.string,
    field: rt.string,
    value: rt.union([rt.string, rt.undefined]),
    highlights: rt.array(rt.string),
  }),
  rt.type({
    columnId: rt.string,
    message: rt.array(logMessagePartRT),
  }),
]);

export const logEntryRT = rt.type({
  id: rt.string,
  cursor: logEntriesCursorRT,
  columns: rt.array(logColumnRT),
});

export type LogMessagepart = rt.TypeOf<typeof logMessagePartRT>;
export type LogColumn = rt.TypeOf<typeof logColumnRT>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;

export const logEntriesResponseRT = rt.type({
  data: rt.type({
    entries: rt.array(logEntryRT),
    topCursor: logEntriesCursorRT,
    bottomCursor: logEntriesCursorRT,
  }),
});

export type LogEntriesResponse = rt.TypeOf<typeof logEntriesResponseRT>;
