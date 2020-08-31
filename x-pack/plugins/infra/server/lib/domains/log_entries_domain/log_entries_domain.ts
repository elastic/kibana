/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

import { RequestHandlerContext } from 'src/core/server';
import { JsonObject } from '../../../../common/typed_json';
import {
  LogEntriesSummaryBucket,
  LogEntriesSummaryHighlightsBucket,
  LogEntry,
  LogEntriesItem,
  LogEntriesCursor,
  LogColumn,
} from '../../../../common/http_api';
import {
  InfraSourceConfiguration,
  InfraSources,
  SavedSourceConfigurationFieldColumnRuntimeType,
} from '../../sources';
import { getBuiltinRules } from './builtin_rules';
import { convertDocumentSourceToLogItemFields } from './convert_document_source_to_log_item_fields';
import {
  CompiledLogMessageFormattingRule,
  Fields,
  Highlights,
  compileFormattingRules,
} from './message';
import { KibanaFramework } from '../../adapters/framework/kibana_framework_adapter';
import { decodeOrThrow } from '../../../../common/runtime_types';
import {
  logEntryDatasetsResponseRT,
  LogEntryDatasetBucket,
  CompositeDatasetKey,
  createLogEntryDatasetsQuery,
} from './queries/log_entry_datasets';

export interface LogEntriesParams {
  startTimestamp: number;
  endTimestamp: number;
  size?: number;
  query?: JsonObject;
  cursor?: { before: LogEntriesCursor | 'last' } | { after: LogEntriesCursor | 'first' };
  highlightTerm?: string;
}
export interface LogEntriesAroundParams {
  startTimestamp: number;
  endTimestamp: number;
  size?: number;
  center: LogEntriesCursor;
  query?: JsonObject;
  highlightTerm?: string;
}

export const LOG_ENTRIES_PAGE_SIZE = 200;

const FIELDS_FROM_CONTEXT = ['log.file.path', 'host.name', 'container.id'] as const;

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export class InfraLogEntriesDomain {
  constructor(
    private readonly adapter: LogEntriesAdapter,
    private readonly libs: {
      framework: KibanaFramework;
      sources: InfraSources;
    }
  ) {}

  public async getLogEntriesAround(
    requestContext: RequestHandlerContext,
    sourceId: string,
    params: LogEntriesAroundParams
  ) {
    const { startTimestamp, endTimestamp, center, query, size, highlightTerm } = params;

    /*
     * For odd sizes we will round this value down for the first half, and up
     * for the second. This keeps the center cursor right in the center.
     *
     * For even sizes the half before is one entry bigger than the half after.
     * [1, 2, 3, 4, 5, *6*, 7, 8, 9, 10]
     *  | 5 entries |       |4 entries|
     */
    const halfSize = (size || LOG_ENTRIES_PAGE_SIZE) / 2;

    const entriesBefore = await this.getLogEntries(requestContext, sourceId, {
      startTimestamp,
      endTimestamp,
      query,
      cursor: { before: center },
      size: Math.floor(halfSize),
      highlightTerm,
    });

    /*
     * Elasticsearch's `search_after` returns documents after the specified cursor.
     * - If we have documents before the center, we search after the last of
     *   those. The first document of the new group is the center.
     * - If there were no documents, we search one milisecond before the
     *   center. It then becomes the first document.
     */
    const cursorAfter =
      entriesBefore.length > 0
        ? entriesBefore[entriesBefore.length - 1].cursor
        : { time: center.time - 1, tiebreaker: 0 };

    const entriesAfter = await this.getLogEntries(requestContext, sourceId, {
      startTimestamp,
      endTimestamp,
      query,
      cursor: { after: cursorAfter },
      size: Math.ceil(halfSize),
      highlightTerm,
    });

    return [...entriesBefore, ...entriesAfter];
  }

  public async getLogEntries(
    requestContext: RequestHandlerContext,
    sourceId: string,
    params: LogEntriesParams
  ): Promise<LogEntry[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );

    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );

    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const documents = await this.adapter.getLogEntries(
      requestContext,
      configuration,
      requiredFields,
      params
    );

    const entries = documents.map((doc) => {
      return {
        id: doc.id,
        cursor: doc.cursor,
        columns: configuration.logColumns.map(
          (column): LogColumn => {
            if ('timestampColumn' in column) {
              return {
                columnId: column.timestampColumn.id,
                timestamp: doc.cursor.time,
              };
            } else if ('messageColumn' in column) {
              return {
                columnId: column.messageColumn.id,
                message: messageFormattingRules.format(doc.fields, doc.highlights),
              };
            } else {
              return {
                columnId: column.fieldColumn.id,
                field: column.fieldColumn.field,
                value: doc.fields[column.fieldColumn.field],
                highlights: doc.highlights[column.fieldColumn.field] || [],
              };
            }
          }
        ),
        context: getContextFromDoc(doc),
      };
    });

    return entries;
  }

  public async getLogSummaryBucketsBetween(
    requestContext: RequestHandlerContext,
    sourceId: string,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogEntriesSummaryBucket[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const dateRangeBuckets = await this.adapter.getContainedLogSummaryBuckets(
      requestContext,
      configuration,
      start,
      end,
      bucketSize,
      filterQuery
    );
    return dateRangeBuckets;
  }

  public async getLogSummaryHighlightBucketsBetween(
    requestContext: RequestHandlerContext,
    sourceId: string,
    startTimestamp: number,
    endTimestamp: number,
    bucketSize: number,
    highlightQueries: string[],
    filterQuery?: LogEntryQuery
  ): Promise<LogEntriesSummaryHighlightsBucket[][]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );
    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const summaries = await Promise.all(
      highlightQueries.map(async (highlightQueryPhrase) => {
        const highlightQuery = createHighlightQueryDsl(highlightQueryPhrase, requiredFields);
        const query = filterQuery
          ? {
              bool: {
                must: [filterQuery, highlightQuery],
              },
            }
          : highlightQuery;
        const summaryBuckets = await this.adapter.getContainedLogSummaryBuckets(
          requestContext,
          configuration,
          startTimestamp,
          endTimestamp,
          bucketSize,
          query
        );
        const summaryHighlightBuckets = summaryBuckets
          .filter(logSummaryBucketHasEntries)
          .map(convertLogSummaryBucketToSummaryHighlightBucket);
        return summaryHighlightBuckets;
      })
    );

    return summaries;
  }

  public async getLogItem(
    requestContext: RequestHandlerContext,
    id: string,
    sourceConfiguration: InfraSourceConfiguration
  ): Promise<LogEntriesItem> {
    const document = await this.adapter.getLogItem(requestContext, id, sourceConfiguration);
    const defaultFields = [
      { field: '_index', value: document._index },
      { field: '_id', value: document._id },
    ];

    return {
      id: document._id,
      index: document._index,
      key: {
        time: document.sort[0],
        tiebreaker: document.sort[1],
      },
      fields: sortBy(
        [...defaultFields, ...convertDocumentSourceToLogItemFields(document._source)],
        'field'
      ),
    };
  }

  public async getLogEntryDatasets(
    requestContext: RequestHandlerContext,
    timestampField: string,
    indexName: string,
    startTime: number,
    endTime: number
  ) {
    let datasetBuckets: LogEntryDatasetBucket[] = [];
    let afterLatestBatchKey: CompositeDatasetKey | undefined;

    while (true) {
      const datasetsReponse = await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createLogEntryDatasetsQuery(
          indexName,
          timestampField,
          startTime,
          endTime,
          COMPOSITE_AGGREGATION_BATCH_SIZE,
          afterLatestBatchKey
        )
      );

      const { after_key: afterKey, buckets: latestBatchBuckets } = decodeOrThrow(
        logEntryDatasetsResponseRT
      )(datasetsReponse).aggregations.dataset_buckets;

      datasetBuckets = [...datasetBuckets, ...latestBatchBuckets];
      afterLatestBatchKey = afterKey;

      if (latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
        break;
      }
    }

    return datasetBuckets.map(({ key: { dataset } }) => dataset);
  }
}

interface LogItemHit {
  _index: string;
  _id: string;
  _source: JsonObject;
  sort: [number, number];
}

export interface LogEntriesAdapter {
  getLogEntries(
    requestContext: RequestHandlerContext,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    params: LogEntriesParams
  ): Promise<LogEntryDocument[]>;

  getContainedLogSummaryBuckets(
    requestContext: RequestHandlerContext,
    sourceConfiguration: InfraSourceConfiguration,
    startTimestamp: number,
    endTimestamp: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogSummaryBucket[]>;

  getLogItem(
    requestContext: RequestHandlerContext,
    id: string,
    source: InfraSourceConfiguration
  ): Promise<LogItemHit>;
}

export type LogEntryQuery = JsonObject;

export interface LogEntryDocument {
  id: string;
  fields: Fields;
  highlights: Highlights;
  cursor: LogEntriesCursor;
}

export interface LogSummaryBucket {
  entriesCount: number;
  start: number;
  end: number;
  topEntryKeys: LogEntriesCursor[];
}

const logSummaryBucketHasEntries = (bucket: LogSummaryBucket) =>
  bucket.entriesCount > 0 && bucket.topEntryKeys.length > 0;

const convertLogSummaryBucketToSummaryHighlightBucket = (
  bucket: LogSummaryBucket
): LogEntriesSummaryHighlightsBucket => ({
  entriesCount: bucket.entriesCount,
  start: bucket.start,
  end: bucket.end,
  representativeKey: bucket.topEntryKeys[0],
});

const getRequiredFields = (
  configuration: InfraSourceConfiguration,
  messageFormattingRules: CompiledLogMessageFormattingRule
): string[] => {
  const fieldsFromCustomColumns = configuration.logColumns.reduce<string[]>(
    (accumulatedFields, logColumn) => {
      if (SavedSourceConfigurationFieldColumnRuntimeType.is(logColumn)) {
        return [...accumulatedFields, logColumn.fieldColumn.field];
      }
      return accumulatedFields;
    },
    []
  );
  const fieldsFromFormattingRules = messageFormattingRules.requiredFields;

  return Array.from(
    new Set([...fieldsFromCustomColumns, ...fieldsFromFormattingRules, ...FIELDS_FROM_CONTEXT])
  );
};

const createHighlightQueryDsl = (phrase: string, fields: string[]) => ({
  multi_match: {
    fields,
    lenient: true,
    query: phrase,
    type: 'phrase',
  },
});

const getContextFromDoc = (doc: LogEntryDocument): LogEntry['context'] => {
  // Get all context fields, then test for the presence and type of the ones that go together
  const containerId = doc.fields['container.id'];
  const hostName = doc.fields['host.name'];
  const logFilePath = doc.fields['log.file.path'];

  if (typeof containerId === 'string') {
    return { 'container.id': containerId };
  }

  if (typeof hostName === 'string' && typeof logFilePath === 'string') {
    return { 'host.name': hostName, 'log.file.path': logFilePath };
  }

  return {};
};
