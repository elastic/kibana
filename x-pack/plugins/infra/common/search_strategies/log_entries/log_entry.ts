/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntriesCursorRT } from '../../http_api/log_entries';
import { jsonArrayRT } from '../../typed_json';
import { errorRT } from '../common/errors';

export const LOG_ENTRY_SEARCH_STRATEGY = 'infra/log-entry';

export const logEntrySearchRequestParamsRT = rt.type({
  sourceId: rt.string,
  logEntryId: rt.string,
});

export type LogEntrySearchRequestParams = rt.TypeOf<typeof logEntrySearchRequestParamsRT>;

const logEntryFieldRT = rt.type({
  field: rt.string,
  value: jsonArrayRT,
});

export const logEntryRT = rt.type({
  id: rt.string,
  index: rt.string,
  fields: rt.array(logEntryFieldRT),
  key: logEntriesCursorRT,
});

export type LogEntry = rt.TypeOf<typeof logEntryRT>;

export const logEntrySearchResponsePayloadRT = rt.intersection([
  rt.type({
    data: logEntryRT,
  }),
  rt.partial({
    errors: rt.array(errorRT),
  }),
]);

export type LogEntrySearchResponsePayload = rt.TypeOf<typeof logEntrySearchResponsePayloadRT>;
