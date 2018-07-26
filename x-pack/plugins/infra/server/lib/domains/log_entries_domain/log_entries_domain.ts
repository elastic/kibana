/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraLogEntry, InfraLogMessageSegment } from '../../../../common/graphql/types';
import { TimeKey } from '../../../../common/time';
import { InfraFrameworkRequest } from '../../adapters/framework';
import { InfraSourceConfiguration, InfraSources } from '../../sources';
import { builtinRules } from './builtin_rules';
import { compileFormattingRules } from './message';

export class InfraLogEntriesDomain {
  constructor(
    private readonly adapter: LogEntriesAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogEntriesAfter(
    request: InfraFrameworkRequest,
    sourceId: string,
    key: TimeKey,
    maxCount: number,
    filterQuery?: string,
    highlightQuery?: string
  ): Promise<InfraLogEntry[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const formattingRules = compileFormattingRules(builtinRules);
    const documents = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      sourceConfiguration,
      formattingRules.requiredFields,
      key,
      'asc',
      maxCount,
      filterQuery,
      highlightQuery
    );
    const entries = documents.map(convertLogDocumentToEntry(sourceId, formattingRules.format));
    return entries;
  }

  public async getLogEntriesBefore(
    request: InfraFrameworkRequest,
    sourceId: string,
    key: TimeKey,
    maxCount: number,
    filterQuery?: string,
    highlightQuery?: string
  ): Promise<InfraLogEntry[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const formattingRules = compileFormattingRules(builtinRules);
    const documents = await this.adapter.getAdjacentLogEntryDocuments(
      request,
      sourceConfiguration,
      formattingRules.requiredFields,
      key,
      'desc',
      maxCount,
      filterQuery,
      highlightQuery
    );
    const entries = documents.map(convertLogDocumentToEntry(sourceId, formattingRules.format));
    return entries;
  }

  public async getLogEntriesBetween(
    request: InfraFrameworkRequest,
    sourceId: string,
    startKey: TimeKey,
    endKey: TimeKey,
    filterQuery?: string,
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
}

export interface LogEntriesAdapter {
  getAdjacentLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    direction: 'asc' | 'desc',
    maxCount: number,
    filterQuery?: string,
    highlightQuery?: string
  ): Promise<LogEntryDocument[]>;

  getContainedLogEntryDocuments(
    request: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    start: TimeKey,
    end: TimeKey,
    filterQuery?: string,
    highlightQuery?: string
  ): Promise<LogEntryDocument[]>;
}

export interface LogEntryDocument {
  fields: LogEntryDocumentFields;
  gid: string;
  key: TimeKey;
}

export interface LogEntryDocumentFields {
  [fieldName: string]: string | number | null;
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
