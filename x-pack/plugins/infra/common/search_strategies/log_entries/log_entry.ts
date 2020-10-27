/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ENTRY_SEARCH_STRATEGY = 'infra/log-entry';

export const logEntrySearchRequestParamsRT = rt.type({
  sourceId: rt.string,
  id: rt.string,
});

export type LogEntrySearchRequestParams = rt.TypeOf<typeof logEntrySearchRequestParamsRT>;

// const logEntriesItemFieldRT = rt.type({ field: rt.string, value: rt.string });
// const logEntriesItemRT = rt.type({
//   id: rt.string,
//   index: rt.string,
//   fields: rt.array(logEntriesItemFieldRT),
//   key: logEntriesCursorRT,
// });
// export const logEntriesItemResponseRT = rt.type({
//   data: logEntriesItemRT,
// });

// export type LogEntriesItemField = rt.TypeOf<typeof logEntriesItemFieldRT>;
// export type LogEntriesItem = rt.TypeOf<typeof logEntriesItemRT>;
// export type LogEntriesItemResponse = rt.TypeOf<typeof logEntriesItemResponseRT>;
// export const logEntrySearchRequestParamsRT = logEntriesItemRequestRT;

// export type LogEntrySearchRequestParams = LogEntriesItemRequest;
