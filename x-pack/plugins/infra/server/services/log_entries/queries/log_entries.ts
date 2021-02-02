/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { RequestParams } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import {
  LogEntryAfterCursor,
  logEntryAfterCursorRT,
  LogEntryBeforeCursor,
  logEntryBeforeCursorRT,
} from '../../../../common/log_entry';
import { jsonArrayRT, JsonObject } from '../../../../common/typed_json';
import {
  commonHitFieldsRT,
  commonSearchSuccessResponseFieldsRT,
} from '../../../utils/elasticsearch_runtime_types';
import { createSortClause, createTimeRangeFilterClauses } from './common';

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
): RequestParams.AsyncSearchSubmit<Record<string, any>> => {
  const sortDirection = getSortDirection(cursor);
  const highlightQuery = createHighlightQuery(highlightTerm, fields);

  return {
    index: logEntriesIndex,
    allow_no_indices: true,
    track_scores: false,
    track_total_hits: false,
    body: {
      size,
      query: {
        bool: {
          filter: [
            ...(query ? [query] : []),
            ...(highlightQuery ? [highlightQuery] : []),
            ...createTimeRangeFilterClauses(startTimestamp, endTimestamp, timestampField),
          ],
        },
      },
      fields,
      _source: false,
      ...createSortClause(sortDirection, timestampField, tiebreakerField),
      ...createSearchAfterClause(cursor),
      ...createHighlightClause(highlightQuery, fields),
    },
  };
};

export const getSortDirection = (
  cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined
): 'asc' | 'desc' => (logEntryBeforeCursorRT.is(cursor) ? 'desc' : 'asc');

const createSearchAfterClause = (
  cursor: LogEntryBeforeCursor | LogEntryAfterCursor | null | undefined
): { search_after?: [number, number] } => {
  if (logEntryBeforeCursorRT.is(cursor) && cursor.before !== 'last') {
    return {
      search_after: [cursor.before.time, cursor.before.tiebreaker],
    };
  } else if (logEntryAfterCursorRT.is(cursor) && cursor.after !== 'first') {
    return {
      search_after: [cursor.after.time, cursor.after.tiebreaker],
    };
  }

  return {};
};

const createHighlightClause = (highlightQuery: JsonObject | undefined, fields: string[]) =>
  highlightQuery
    ? {
        highlight: {
          boundary_scanner: 'word',
          fields: fields.reduce(
            (highlightFieldConfigs, fieldName) => ({
              ...highlightFieldConfigs,
              [fieldName]: {},
            }),
            {}
          ),
          fragment_size: 1,
          number_of_fragments: 100,
          post_tags: [''],
          pre_tags: [''],
          highlight_query: highlightQuery,
        },
      }
    : {};

const createHighlightQuery = (
  highlightTerm: string | undefined,
  fields: string[]
): JsonObject | undefined => {
  if (highlightTerm) {
    return {
      multi_match: {
        fields,
        lenient: true,
        query: highlightTerm,
        type: 'phrase',
      },
    };
  }
};

export const logEntryHitRT = rt.intersection([
  commonHitFieldsRT,
  rt.type({
    fields: rt.record(rt.string, jsonArrayRT),
    sort: rt.tuple([rt.number, rt.number]),
  }),
  rt.partial({
    highlight: rt.record(rt.string, rt.array(rt.string)),
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
