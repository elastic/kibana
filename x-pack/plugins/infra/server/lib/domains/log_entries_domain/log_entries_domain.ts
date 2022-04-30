/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { JsonObject } from '@kbn/utility-types';

import type { InfraPluginRequestHandlerContext } from '../../../types';

import {
  LogEntriesSummaryBucket,
  LogEntriesSummaryHighlightsBucket,
} from '../../../../common/http_api';
import {
  LogSourceColumnConfiguration,
  ResolvedLogSourceConfiguration,
  resolveLogSourceConfiguration,
} from '../../../../common/log_sources';
import { LogColumn, LogEntryCursor, LogEntry } from '../../../../common/log_entry';
import {
  InfraSourceConfiguration,
  InfraSources,
  SourceConfigurationFieldColumnRuntimeType,
} from '../../sources';
import { getBuiltinRules } from '../../../services/log_entries/message/builtin_rules';
import {
  CompiledLogMessageFormattingRule,
  Fields,
  Highlights,
  compileFormattingRules,
} from '../../../services/log_entries/message/message';
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
  cursor?: { before: LogEntryCursor | 'last' } | { after: LogEntryCursor | 'first' };
  highlightTerm?: string;
}
export interface LogEntriesAroundParams {
  startTimestamp: number;
  endTimestamp: number;
  size?: number;
  center: LogEntryCursor;
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
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string,
    params: LogEntriesAroundParams,
    columnOverrides?: LogSourceColumnConfiguration[]
  ): Promise<{ entries: LogEntry[]; hasMoreBefore?: boolean; hasMoreAfter?: boolean }> {
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

    const { entries: entriesBefore, hasMoreBefore } = await this.getLogEntries(
      requestContext,
      sourceId,
      {
        startTimestamp,
        endTimestamp,
        query,
        cursor: { before: center },
        size: Math.floor(halfSize),
        highlightTerm,
      },
      columnOverrides
    );

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

    const { entries: entriesAfter, hasMoreAfter } = await this.getLogEntries(
      requestContext,
      sourceId,
      {
        startTimestamp,
        endTimestamp,
        query,
        cursor: { after: cursorAfter },
        size: Math.ceil(halfSize),
        highlightTerm,
      }
    );

    return { entries: [...entriesBefore, ...entriesAfter], hasMoreBefore, hasMoreAfter };
  }

  public async getLogEntries(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string,
    params: LogEntriesParams,
    columnOverrides?: LogSourceColumnConfiguration[]
  ): Promise<{ entries: LogEntry[]; hasMoreBefore?: boolean; hasMoreAfter?: boolean }> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const resolvedLogSourceConfiguration = await resolveLogSourceConfiguration(
      configuration,
      await this.libs.framework.getIndexPatternsServiceWithRequestContext(requestContext)
    );
    const columnDefinitions = columnOverrides ?? configuration.logColumns;

    const messageFormattingRules = compileFormattingRules(
      getBuiltinRules(configuration.fields.message)
    );

    const requiredFields = getRequiredFields(configuration, messageFormattingRules);

    const { documents, hasMoreBefore, hasMoreAfter } = await this.adapter.getLogEntries(
      requestContext,
      resolvedLogSourceConfiguration,
      requiredFields,
      params
    );

    const entries = documents.map((doc) => {
      return {
        id: doc.id,
        index: doc.index,
        cursor: doc.cursor,
        columns: columnDefinitions.map((column): LogColumn => {
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
              value: doc.fields[column.fieldColumn.field] ?? [],
              highlights: doc.highlights[column.fieldColumn.field] ?? [],
            };
          }
        }),
        context: getContextFromDoc(doc),
      };
    });

    return { entries, hasMoreBefore, hasMoreAfter };
  }

  public async getLogSummaryBucketsBetween(
    requestContext: InfraPluginRequestHandlerContext,
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
    const resolvedLogSourceConfiguration = await resolveLogSourceConfiguration(
      configuration,
      await this.libs.framework.getIndexPatternsServiceWithRequestContext(requestContext)
    );
    const dateRangeBuckets = await this.adapter.getContainedLogSummaryBuckets(
      requestContext,
      resolvedLogSourceConfiguration,
      start,
      end,
      bucketSize,
      filterQuery
    );
    return dateRangeBuckets;
  }

  public async getLogSummaryHighlightBucketsBetween(
    requestContext: InfraPluginRequestHandlerContext,
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
    const resolvedLogSourceConfiguration = await resolveLogSourceConfiguration(
      configuration,
      await this.libs.framework.getIndexPatternsServiceWithRequestContext(requestContext)
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
          resolvedLogSourceConfiguration,
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

  public async getLogEntryDatasets(
    requestContext: InfraPluginRequestHandlerContext,
    timestampField: string,
    indexName: string,
    startTime: number,
    endTime: number,
    runtimeMappings: estypes.MappingRuntimeFields
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
          runtimeMappings,
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

export interface LogEntriesAdapter {
  getLogEntries(
    requestContext: InfraPluginRequestHandlerContext,
    resolvedLogSourceConfiguration: ResolvedLogSourceConfiguration,
    fields: string[],
    params: LogEntriesParams
  ): Promise<{ documents: LogEntryDocument[]; hasMoreBefore?: boolean; hasMoreAfter?: boolean }>;

  getContainedLogSummaryBuckets(
    requestContext: InfraPluginRequestHandlerContext,
    resolvedLogSourceConfiguration: ResolvedLogSourceConfiguration,
    startTimestamp: number,
    endTimestamp: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogSummaryBucket[]>;
}

export type LogEntryQuery = JsonObject;

export interface LogEntryDocument {
  id: string;
  index: string;
  fields: Fields;
  highlights: Highlights;
  cursor: LogEntryCursor;
}

export interface LogSummaryBucket {
  entriesCount: number;
  start: number;
  end: number;
  topEntryKeys: LogEntryCursor[];
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
      if (SourceConfigurationFieldColumnRuntimeType.is(logColumn)) {
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
  const containerId = doc.fields['container.id']?.[0];
  const hostName = doc.fields['host.name']?.[0];
  const logFilePath = doc.fields['log.file.path']?.[0];

  if (typeof containerId === 'string') {
    return { 'container.id': containerId };
  }

  if (typeof hostName === 'string' && typeof logFilePath === 'string') {
    return { 'host.name': hostName, 'log.file.path': logFilePath };
  }

  return {};
};
