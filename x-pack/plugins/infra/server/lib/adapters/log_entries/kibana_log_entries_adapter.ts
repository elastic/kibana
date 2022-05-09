/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeMilliseconds } from 'd3-time';
import { fold, map } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as runtimeTypes from 'io-ts';
import { JsonArray } from '@kbn/utility-types';
import { compact } from 'lodash';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import {
  LogEntriesAdapter,
  LogEntriesParams,
  LogEntryDocument,
  LogEntryQuery,
  LogSummaryBucket,
  LOG_ENTRIES_PAGE_SIZE,
} from '../../domains/log_entries_domain';
import { SortedSearchHit } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { ResolvedLogView } from '../../../../common/log_views';
import { TIMESTAMP_FIELD, TIEBREAKER_FIELD } from '../../../../common/constants';

const TIMESTAMP_FORMAT = 'epoch_millis';

export class InfraKibanaLogEntriesAdapter implements LogEntriesAdapter {
  constructor(private readonly framework: KibanaFramework) {}

  public async getLogEntries(
    requestContext: InfraPluginRequestHandlerContext,
    resolvedLogView: ResolvedLogView,
    fields: string[],
    params: LogEntriesParams
  ): Promise<{ documents: LogEntryDocument[]; hasMoreBefore?: boolean; hasMoreAfter?: boolean }> {
    const { startTimestamp, endTimestamp, query, cursor, highlightTerm } = params;
    const size = params.size ?? LOG_ENTRIES_PAGE_SIZE;

    const { sortDirection, searchAfterClause } = processCursor(cursor);

    const highlightQuery = createHighlightQuery(highlightTerm, fields);

    const highlightClause = highlightQuery
      ? {
          highlight: {
            boundary_scanner: 'word' as const,
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

    const sort = {
      [TIMESTAMP_FIELD]: sortDirection,
      [TIEBREAKER_FIELD]: sortDirection,
    };

    const esQuery = {
      allow_no_indices: true,
      index: resolvedLogView.indices,
      ignore_unavailable: true,
      body: {
        size: size + 1, // Extra one to test if it has more before or after
        track_total_hits: false,
        _source: false,
        fields,
        query: {
          bool: {
            filter: [
              ...createFilterClauses(query, highlightQuery),
              {
                range: {
                  [TIMESTAMP_FIELD]: {
                    gte: startTimestamp,
                    lte: endTimestamp,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: resolvedLogView.runtimeMappings,
        sort,
        ...highlightClause,
        ...searchAfterClause,
      },
    };

    const esResult = await this.framework.callWithRequest<SortedSearchHit>(
      requestContext,
      'search',
      esQuery
    );

    const hits = esResult.hits.hits;
    const hasMore = hits.length > size;

    if (hasMore) {
      hits.pop();
    }

    if (sortDirection === 'desc') {
      hits.reverse();
    }

    return {
      documents: mapHitsToLogEntryDocuments(hits, fields),
      hasMoreBefore: sortDirection === 'desc' ? hasMore : undefined,
      hasMoreAfter: sortDirection === 'asc' ? hasMore : undefined,
    };
  }

  public async getContainedLogSummaryBuckets(
    requestContext: InfraPluginRequestHandlerContext,
    resolvedLogView: ResolvedLogView,
    startTimestamp: number,
    endTimestamp: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogSummaryBucket[]> {
    const bucketIntervalStarts = timeMilliseconds(
      new Date(startTimestamp),
      new Date(endTimestamp),
      bucketSize
    );

    const query = {
      allow_no_indices: true,
      index: resolvedLogView.indices,
      ignore_unavailable: true,
      body: {
        aggregations: {
          count_by_date: {
            date_range: {
              field: TIMESTAMP_FIELD,
              format: TIMESTAMP_FORMAT,
              ranges: bucketIntervalStarts.map((bucketIntervalStart) => ({
                from: bucketIntervalStart.getTime(),
                to: bucketIntervalStart.getTime() + bucketSize,
              })),
            },
            aggregations: {
              top_hits_by_key: {
                top_hits: {
                  size: 1,
                  sort: [{ [TIMESTAMP_FIELD]: 'asc' }, { [TIEBREAKER_FIELD]: 'asc' }],
                  _source: false,
                },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              ...createQueryFilterClauses(filterQuery),
              {
                range: {
                  [TIMESTAMP_FIELD]: {
                    gte: startTimestamp,
                    lte: endTimestamp,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: resolvedLogView.runtimeMappings,
        size: 0,
        track_total_hits: false,
      },
    };

    const response = await this.framework.callWithRequest<any, {}>(requestContext, 'search', query);

    return pipe(
      LogSummaryResponseRuntimeType.decode(response),
      map((logSummaryResponse) =>
        logSummaryResponse.aggregations.count_by_date.buckets.map(
          convertDateRangeBucketToSummaryBucket
        )
      ),
      fold(constant([]), identity)
    );
  }
}

function mapHitsToLogEntryDocuments(hits: SortedSearchHit[], fields: string[]): LogEntryDocument[] {
  return hits.map((hit) => {
    const logFields = fields.reduce<{ [fieldName: string]: JsonArray }>(
      (flattenedFields, field) =>
        field in hit.fields
          ? {
              ...flattenedFields,
              [field]: hit.fields[field],
            }
          : flattenedFields,
      {}
    );

    return {
      id: hit._id,
      index: hit._index,
      cursor: { time: hit.sort[0], tiebreaker: hit.sort[1] },
      fields: logFields,
      highlights: hit.highlight || {},
    };
  });
}

const convertDateRangeBucketToSummaryBucket = (
  bucket: LogSummaryDateRangeBucket
): LogSummaryBucket => ({
  entriesCount: bucket.doc_count,
  start: bucket.from || 0,
  end: bucket.to || 0,
  topEntryKeys: bucket.top_hits_by_key.hits.hits.map((hit) => ({
    tiebreaker: hit.sort[1],
    time: hit.sort[0],
  })),
});

const createHighlightQuery = (
  highlightTerm: string | undefined,
  fields: string[]
): LogEntryQuery | undefined => {
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

const createFilterClauses = (
  filterQuery?: LogEntryQuery,
  highlightQuery?: LogEntryQuery
): LogEntryQuery[] => {
  if (filterQuery && highlightQuery) {
    return [{ bool: { filter: [filterQuery, highlightQuery] } }];
  }

  return compact([filterQuery, highlightQuery]) as LogEntryQuery[];
};

const createQueryFilterClauses = (filterQuery: LogEntryQuery | undefined) =>
  filterQuery ? [filterQuery] : [];

function processCursor(cursor: LogEntriesParams['cursor']): {
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

const LogSummaryDateRangeBucketRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    doc_count: runtimeTypes.number,
    key: runtimeTypes.string,
    top_hits_by_key: runtimeTypes.type({
      hits: runtimeTypes.type({
        hits: runtimeTypes.array(
          runtimeTypes.type({
            sort: runtimeTypes.tuple([runtimeTypes.number, runtimeTypes.number]),
          })
        ),
      }),
    }),
  }),
  runtimeTypes.partial({
    from: runtimeTypes.number,
    to: runtimeTypes.number,
  }),
]);

export type LogSummaryDateRangeBucket = runtimeTypes.TypeOf<
  typeof LogSummaryDateRangeBucketRuntimeType
>;

const LogSummaryResponseRuntimeType = runtimeTypes.type({
  aggregations: runtimeTypes.type({
    count_by_date: runtimeTypes.type({
      buckets: runtimeTypes.array(LogSummaryDateRangeBucketRuntimeType),
    }),
  }),
});

export type LogSummaryResponse = runtimeTypes.TypeOf<typeof LogSummaryResponseRuntimeType>;
