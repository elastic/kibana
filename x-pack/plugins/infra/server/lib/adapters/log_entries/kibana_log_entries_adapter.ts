/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timeMilliseconds } from 'd3-time';
import get from 'lodash/fp/get';
import has from 'lodash/fp/has';
import zip from 'lodash/fp/zip';

import { compareTimeKeys, isTimeKey, TimeKey } from '../../../../common/time';
import {
  LogEntriesAdapter,
  LogEntryDocument,
  LogEntryQuery,
} from '../../domains/log_entries_domain';
import { InfraSourceConfiguration } from '../../sources';
import {
  InfraDateRangeAggregationBucket,
  InfraDateRangeAggregationResponse,
  InfraFrameworkRequest,
  SortedSearchHit,
} from '../framework';
import { InfraBackendFrameworkAdapter } from '../framework';

const DAY_MILLIS = 24 * 60 * 60 * 1000;
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000, Infinity].map(days => days * DAY_MILLIS);
const TIMESTAMP_FORMAT = 'epoch_millis';

export class InfraKibanaLogEntriesAdapter implements LogEntriesAdapter {
  constructor(private readonly framework: InfraBackendFrameworkAdapter) {}

  public async getAdjacentLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    direction: 'asc' | 'desc',
    maxCount: number,
    filterQuery: LogEntryQuery,
    highlightQuery: string
  ): Promise<LogEntryDocument[]> {
    if (maxCount <= 0) {
      return [];
    }

    const intervals = getLookupIntervals(start.time, direction);

    let documents: LogEntryDocument[] = [];
    for (const [intervalStart, intervalEnd] of intervals) {
      if (documents.length >= maxCount) {
        break;
      }

      const documentsInInterval = await this.getLogEntryDocumentsBetween(
        request,
        sourceConfiguration,
        fields,
        intervalStart,
        intervalEnd,
        documents.length > 0 ? documents[documents.length - 1].key : start,
        maxCount - documents.length,
        filterQuery,
        highlightQuery
      );

      documents = [...documents, ...documentsInInterval];
    }

    return direction === 'asc' ? documents : documents.reverse();
  }

  public async getContainedLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    end: TimeKey,
    filterQuery: LogEntryQuery,
    highlightQuery: string
  ): Promise<LogEntryDocument[]> {
    const documents = await this.getLogEntryDocumentsBetween(
      request,
      sourceConfiguration,
      fields,
      start.time,
      end.time,
      start,
      10000,
      filterQuery,
      highlightQuery
    );

    return documents.filter(document => compareTimeKeys(document.key, end) < 0);
  }

  public async getContainedLogSummaryBuckets(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery: LogEntryQuery
  ): Promise<InfraDateRangeAggregationBucket[]> {
    const bucketIntervalStarts = timeMilliseconds(new Date(start), new Date(end), bucketSize);

    const query = {
      allowNoIndices: true,
      index: sourceConfiguration.logAlias,
      ignoreUnavailable: true,
      body: {
        aggregations: {
          count_by_date: {
            date_range: {
              field: sourceConfiguration.fields.timestamp,
              format: TIMESTAMP_FORMAT,
              ranges: bucketIntervalStarts.map(bucketIntervalStart => ({
                from: bucketIntervalStart.getTime(),
                to: bucketIntervalStart.getTime() + bucketSize,
              })),
            },
          },
        },
        query: {
          bool: {
            filter: [
              ...createQueryFilterClauses(filterQuery),
              {
                range: {
                  [sourceConfiguration.fields.timestamp]: {
                    gte: start,
                    lte: end,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        size: 0,
      },
    };

    const response = await this.framework.callWithRequest<
      any,
      { count_by_date?: InfraDateRangeAggregationResponse }
    >(request, 'search', query);

    return response.aggregations && response.aggregations.count_by_date
      ? response.aggregations.count_by_date.buckets
      : [];
  }

  private async getLogEntryDocumentsBetween(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: number,
    end: number,
    after: TimeKey | null,
    maxCount: number,
    filterQuery?: LogEntryQuery,
    highlightQuery?: string
  ): Promise<LogEntryDocument[]> {
    if (maxCount <= 0) {
      return [];
    }

    const sortDirection: 'asc' | 'desc' = start <= end ? 'asc' : 'desc';

    const startRange = {
      [sortDirection === 'asc' ? 'gte' : 'lte']: start,
    };
    const endRange =
      end === Infinity
        ? {}
        : {
            [sortDirection === 'asc' ? 'lte' : 'gte']: end,
          };

    const highlightClause = highlightQuery
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
          },
        }
      : {};

    const searchAfterClause = isTimeKey(after)
      ? {
          search_after: [after.time, after.tiebreaker],
        }
      : {};

    const query = {
      allowNoIndices: true,
      index: sourceConfiguration.logAlias,
      ignoreUnavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              ...createQueryFilterClauses(filterQuery),
              {
                range: {
                  [sourceConfiguration.fields.timestamp]: {
                    ...startRange,
                    ...endRange,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        ...highlightClause,
        ...searchAfterClause,
        _source: fields,
        size: maxCount,
        sort: [
          { [sourceConfiguration.fields.timestamp]: sortDirection },
          { [sourceConfiguration.fields.tiebreaker]: sortDirection },
        ],
        track_total_hits: false,
      },
    };

    const response = await this.framework.callWithRequest<SortedSearchHit>(
      request,
      'search',
      query
    );
    const hits = response.hits.hits;
    const documents = hits.map(convertHitToLogEntryDocument(fields));

    return documents;
  }
}

function getLookupIntervals(start: number, direction: 'asc' | 'desc'): Array<[number, number]> {
  const offsetSign = direction === 'asc' ? 1 : -1;
  const translatedOffsets = LOOKUP_OFFSETS.map(offset => start + offset * offsetSign);
  const intervals = zip(translatedOffsets.slice(0, -1), translatedOffsets.slice(1)) as Array<
    [number, number]
  >;
  return intervals;
}

const convertHitToLogEntryDocument = (fields: string[]) => (
  hit: SortedSearchHit
): LogEntryDocument => ({
  gid: hit._id,
  fields: fields.reduce(
    (flattenedFields, fieldName) =>
      has(fieldName, hit._source)
        ? {
            ...flattenedFields,
            [fieldName]: get(fieldName, hit._source),
          }
        : flattenedFields,
    {} as { [fieldName: string]: string | number | boolean | null }
  ),
  key: {
    time: hit.sort[0],
    tiebreaker: hit.sort[1],
  },
});

const createQueryFilterClauses = (filterQuery: LogEntryQuery | undefined) =>
  filterQuery ? [filterQuery] : [];
