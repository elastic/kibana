/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { RequestParams } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import {
  LogEntryAfterCursor,
  LogEntryBeforeCursor,
  LogEntryCursor,
} from '../../../../common/log_entry';
import { jsonArrayRT, JsonObject } from '../../../../common/typed_json';
import {
  commonHitFieldsRT,
  commonSearchSuccessResponseFieldsRT,
} from '../../../utils/elasticsearch_runtime_types';

export const createGetLogEntriesQuery = (
  logEntriesIndex: string,
  startTimestamp: number,
  endTimestamp: number,
  cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined,
  size: number,
  timestampField: string,
  tiebreakerField: string,
  fields: string[],
  query?: JsonObject,
  highlightTerm?: string
): RequestParams.AsyncSearchSubmit<Record<string, any>> => ({
  index: logEntriesIndex,
  terminate_after: 1,
  track_scores: false,
  track_total_hits: false,
  body: {
    size: 1,
    query: {},
    fields: ['*'],
    // sort: [{ [timestampField]: 'desc' }, { [tiebreakerField]: 'desc' }],
    _source: false,
  },
});

function createSortAndSearchAfterClause(
  cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined
): {
  sortDirection: 'asc' | 'desc';
  searchAfterClause: { search_after?: readonly [number, number] };
} {
  if (cursor) {
    if ('before' in cursor) {
      return {
        sortDirection: 'desc',
        searchAfterClause:
          cursor.before !== 'last'
            ? { search_after: [cursor.before.time, cursor.before.tiebreaker] as const }
            : {},
      };
    } else if (cursor.after !== 'first') {
      return {
        sortDirection: 'asc',
        searchAfterClause: { search_after: [cursor.after.time, cursor.after.tiebreaker] as const },
      };
    }
  }

  return { sortDirection: 'asc', searchAfterClause: {} };
}

export const logEntryHitRT = rt.intersection([
  commonHitFieldsRT,
  rt.type({
    fields: rt.record(rt.string, jsonArrayRT),
    sort: rt.tuple([rt.number, rt.number]),
  }),
]);

export type LogEntryHit = rt.TypeOf<typeof logEntryHitRT>;

export const getLogEntriesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryHitRT),
    }),
  }),
]);

export type GetLogEntriesResponse = rt.TypeOf<typeof getLogEntriesResponseRT>;
