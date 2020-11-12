/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntryCursorRT } from '../../log_entry';
import { jsonArrayRT } from '../../typed_json';
import { errorRT } from '../common/errors';

export const LOG_ENTRY_SEARCH_STRATEGY = 'infra-log-entry';

export const logEntrySearchRequestParamsRT = rt.type({
  sourceId: rt.string,
  logEntryId: rt.string,
});

export type LogEntrySearchRequestParams = rt.TypeOf<typeof logEntrySearchRequestParamsRT>;

const logEntryFieldRT = rt.type({
  field: rt.string,
  value: jsonArrayRT,
});

export type LogEntryField = rt.TypeOf<typeof logEntryFieldRT>;

export const logEntryRT = rt.type({
  id: rt.string,
  index: rt.string,
  fields: rt.array(logEntryFieldRT),
  key: logEntryCursorRT,
});

export type LogEntry = rt.TypeOf<typeof logEntryRT>;

export const logEntrySearchResponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.union([logEntryRT, rt.null]),
  }),
  rt.partial({
    errors: rt.array(errorRT),
  }),
]);

export type LogEntrySearchResponsePayload = rt.TypeOf<typeof logEntrySearchResponsePayloadRT>;
