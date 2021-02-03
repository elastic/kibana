/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntryCursorRT, logEntryRT } from '../../log_entry';
import { logSourceColumnConfigurationRT } from '../log_sources';

export const LOG_ENTRIES_PATH = '/api/log_entries/entries';

export const logEntriesBaseRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startTimestamp: rt.number,
    endTimestamp: rt.number,
  }),
  rt.partial({
    query: rt.union([rt.string, rt.null]),
    size: rt.number,
    columns: rt.array(logSourceColumnConfigurationRT),
  }),
]);

export const logEntriesBeforeRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ before: rt.union([logEntryCursorRT, rt.literal('last')]) }),
]);

export const logEntriesAfterRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ after: rt.union([logEntryCursorRT, rt.literal('first')]) }),
]);

export const logEntriesCenteredRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ center: logEntryCursorRT }),
]);

export const logEntriesRequestRT = rt.union([
  logEntriesBaseRequestRT,
  logEntriesBeforeRequestRT,
  logEntriesAfterRequestRT,
  logEntriesCenteredRequestRT,
]);

export type LogEntriesBaseRequest = rt.TypeOf<typeof logEntriesBaseRequestRT>;
export type LogEntriesBeforeRequest = rt.TypeOf<typeof logEntriesBeforeRequestRT>;
export type LogEntriesAfterRequest = rt.TypeOf<typeof logEntriesAfterRequestRT>;
export type LogEntriesCenteredRequest = rt.TypeOf<typeof logEntriesCenteredRequestRT>;
export type LogEntriesRequest = rt.TypeOf<typeof logEntriesRequestRT>;

export const logEntriesResponseRT = rt.type({
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
});

export type LogEntriesResponse = rt.TypeOf<typeof logEntriesResponseRT>;
