/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntriesCursorRT } from './common';

export const LOG_ENTRIES_ITEM_PATH = '/api/log_entries/item';

/**
 * request
 */
export const logEntriesItemRequestRT = rt.type({
  sourceId: rt.string,
  id: rt.string,
  index: rt.string,
});

export type LogEntriesItemRequest = rt.TypeOf<typeof logEntriesItemRequestRT>;

/**
 * response
 */
const logEntriesItemFieldRT = rt.type({ field: rt.string, value: rt.string });

export type LogEntriesItemField = rt.TypeOf<typeof logEntriesItemFieldRT>;

const logEntriesItemRT = rt.type({
  id: rt.string,
  index: rt.string,
  fields: rt.array(logEntriesItemFieldRT),
  key: logEntriesCursorRT,
});

export type LogEntriesItem = rt.TypeOf<typeof logEntriesItemRT>;

export const logEntriesItemResponseRT = rt.type({
  data: logEntriesItemRT,
});

export type LogEntriesItemResponse = rt.TypeOf<typeof logEntriesItemResponseRT>;
