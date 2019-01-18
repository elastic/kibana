/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeKey } from '../../../../common/time';
import { JsonObject } from '../../../../common/typed_json';
import {
  InfraLogEntry,
  InfraLogMessageSegment,
  InfraLogSummaryBucket,
} from '../../../graphql/types';
import { InfraDateRangeAggregationBucket, InfraFrameworkRequest } from '../../adapters/framework';
import { InfraSourceConfiguration, InfraSources } from '../../sources';
import { builtinRules } from './builtin_rules';
import { compileFormattingRules } from './message';

export class InfraLogEntriesDomain {
  constructor(
    private readonly adapter: LogEntriesAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogEntriesAround(
    request: InfraFrameworkRequest,
    sourceId: string,
    key: TimeKey,
    maxCountBefore: number,
    maxCountAfter: number,
    filterQuery?: LogEntryQuery,
    highlightQuery?: string
  ): Promise<{ entriesBefore: InfraLogEntry[]; entriesAfter: InfraLogEntry[] }> {
    if (maxCountBefore <= 0 && maxCountAfter <= 0) {
      return {
        entriesBefore: [],
        entriesAfter: [],
      };
    }

    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const formattingRules = compileFormattingRules(builtinRules);

    const documentsBefore = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      sourceConfiguration,
      formattingRules.requiredFields,
      key,
      'desc',
      Math.max(maxCountBefore, 1),
      filterQuery,
      highlightQuery
    );
    const lastKeyBefore =
      documentsBefore.length > 0
        ? documentsBefore[documentsBefore.length - 1].key
        : {
            time: key.time - 1,
            tiebreaker: 0,
          };

    const documentsAfter = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      sourceConfiguration,
      formattingRules.requiredFields,
      lastKeyBefore,
      'asc',
      maxCountAfter,
      filterQuery,
      highlightQuery
    );

    return {
      entriesBefore: (maxCountBefore > 0 ? documentsBefore : []).map(
        convertLogDocumentToEntry(sourceId, formattingRules.format)
      ),
      entriesAfter: documentsAfter.map(convertLogDocumentToEntry(sourceId, formattingRules.format)),
    };
  }

  public async getLogEntriesBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    startKey: TimeKey,
    endKey: TimeKey,
    filterQuery?: LogEntryQuery,
    highlightQuery?: string
  ): Promise<InfraLogEntry[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const formattingRules = compileFormattingRules(builtinRules);
    const documents = await this.adapter.getContainedLogEntryDocuments(
      request,
      sourceConfiguration,
      formattingRules.requiredFields,
      startKey,
      endKey,
      filterQuery,
      highlightQuery
    );
    const entries = documents.map(convertLogDocumentToEntry(sourceId, formattingRules.format));
    return entries;
  }

  public async getLogSummaryBucketsBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<InfraLogSummaryBucket[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const dateRangeBuckets = await this.adapter.getContainedLogSummaryBuckets(
      request,
      sourceConfiguration,
      start,
      end,
      bucketSize,
      filterQuery
    );
    const buckets = dateRangeBuckets.map(convertDateRangeBucketToSummaryBucket);
    return buckets;
  }
}

export interface LogEntriesAdapter {
  getAdjacentLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    direction: 'asc' | 'desc',
    maxCount: number,
    filterQuery?: LogEntryQuery,
    highlightQuery?: string
  ): Promise<LogEntryDocument[]>;

  getContainedLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    end: TimeKey,
    filterQuery?: LogEntryQuery,
    highlightQuery?: string
  ): Promise<LogEntryDocument[]>;

  getContainedLogSummaryBuckets(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    start: number,
    end: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<InfraDateRangeAggregationBucket[]>;
}

export type LogEntryQuery = JsonObject;

export interface LogEntryDocument {
  fields: LogEntryDocumentFields;
  gid: string;
  key: TimeKey;
}

export interface LogEntryDocumentFields {
  [fieldName: string]: string | number | boolean | null;
}

const convertLogDocumentToEntry = (
  sourceId: string,
  formatMessage: (fields: LogEntryDocumentFields) => InfraLogMessageSegment[]
) => (document: LogEntryDocument): InfraLogEntry => ({
  key: document.key,
  gid: document.gid,
  source: sourceId,
  message: formatMessage(document.fields),
});

const convertDateRangeBucketToSummaryBucket = (
  bucket: InfraDateRangeAggregationBucket
): InfraLogSummaryBucket => ({
  entriesCount: bucket.doc_count,
  start: bucket.from || 0,
  end: bucket.to || 0,
});
