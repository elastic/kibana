/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import { IIndexPatternString } from '../types';
import { getIndexTemplateAndPattern } from '../lib/data_stream/helpers';
import { DocumentsDataWriter } from '../lib/data_stream/documents_data_writer';
import { FindResponse, findDocuments } from './find';

export interface AIAssistantDataClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  spaceId: string;
  logger: Logger;
  indexPatternsResorceName: string;
  currentUser: AuthenticatedUser | null;
}

export class AIAssistantDataClient {
  /** Kibana space id the document index are part of */
  public readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a document */
  private readonly currentUser: AuthenticatedUser | null;

  private writerCache: Map<string, DocumentsDataWriter> = new Map();

  public indexTemplateAndPattern: IIndexPatternString;

  constructor(public readonly options: AIAssistantDataClientParams) {
    this.indexTemplateAndPattern = getIndexTemplateAndPattern(
      this.options.indexPatternsResorceName,
      this.options.spaceId ?? DEFAULT_NAMESPACE_STRING
    );
    this.currentUser = this.options.currentUser;
    this.spaceId = this.options.spaceId;
  }

  public getWriter = async (): Promise<DocumentsDataWriter> => {
    const spaceId = this.spaceId;
    if (this.writerCache.get(spaceId)) {
      return this.writerCache.get(spaceId) as DocumentsDataWriter;
    }
    await this.initializeWriter(spaceId, this.indexTemplateAndPattern.alias);
    return this.writerCache.get(spaceId) as DocumentsDataWriter;
  };

  private async initializeWriter(spaceId: string, index: string): Promise<DocumentsDataWriter> {
    const esClient = await this.options.elasticsearchClientPromise;
    const writer = new DocumentsDataWriter({
      esClient,
      spaceId,
      index,
      logger: this.options.logger,
      user: { id: this.currentUser?.profile_uid, name: this.currentUser?.username },
    });

    this.writerCache.set(spaceId, writer);
    return writer;
  }

  public getReader = async <TResponse>() => {
    const indexPatterns = this.indexTemplateAndPattern.alias;

    return {
      search: async <TSearchRequest extends ESSearchRequest, TDoc = Partial<TResponse>>(
        request: TSearchRequest
      ): Promise<ESSearchResponse<TDoc, TSearchRequest>> => {
        try {
          const esClient = await this.options.elasticsearchClientPromise;
          return (await esClient.search({
            ...request,
            index: indexPatterns,
            ignore_unavailable: true,
            seq_no_primary_term: true,
          })) as unknown as ESSearchResponse<TDoc, TSearchRequest>;
        } catch (err) {
          this.options.logger.error(
            `Error performing search in AIAssistantDataClient - ${err.message}`
          );
          throw err;
        }
      },
    };
  };

  public findDocuments = async <TSearchSchema>({
    perPage,
    page,
    sortField,
    sortOrder,
    filter,
    fields,
  }: {
    perPage: number;
    page: number;
    sortField?: string;
    sortOrder?: string;
    filter?: string;
    fields?: string[];
  }): Promise<Promise<FindResponse<TSearchSchema>>> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findDocuments<TSearchSchema>({
      esClient,
      fields,
      page,
      perPage,
      filter,
      sortField,
      index: this.indexTemplateAndPattern.alias,
      sortOrder: sortOrder as estypes.SortOrder,
      logger: this.options.logger,
    });
  };
}
