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
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { DocumentsDataWriter } from '../lib/data_client/documents_data_writer';
import { IIndexPatternString } from '../types';
import { getIndexTemplateAndPattern } from '../lib/data_client/helpers';
import { findAnonymizationFields } from './find_anonymization_fields';

export interface AIAssistantAnonymizationFieldsDataClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  spaceId: string;
  logger: Logger;
  indexPatternsResorceName: string;
  currentUser: AuthenticatedUser | null;
}

/**
 * Class for use for anonymization fields that are used for AI assistant.
 */
export class AIAssistantAnonymizationFieldsDataClient {
  /** Kibana space id the anonymization fields are part of */
  private readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a anonymization fields */
  private readonly currentUser: AuthenticatedUser | null;

  private writerCache: Map<string, DocumentsDataWriter> = new Map();

  private indexTemplateAndPattern: IIndexPatternString;

  constructor(private readonly options: AIAssistantAnonymizationFieldsDataClientParams) {
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

  public getReader = async (options: { spaceId?: string } = {}) => {
    const indexPatterns = this.indexTemplateAndPattern.alias;

    return {
      search: async <
        TSearchRequest extends ESSearchRequest,
        TAnonymizationFieldDoc = Partial<AnonymizationFieldResponse>
      >(
        request: TSearchRequest
      ): Promise<ESSearchResponse<TAnonymizationFieldDoc, TSearchRequest>> => {
        try {
          const esClient = await this.options.elasticsearchClientPromise;
          return (await esClient.search({
            ...request,
            index: indexPatterns,
            ignore_unavailable: true,
            seq_no_primary_term: true,
          })) as unknown as ESSearchResponse<TAnonymizationFieldDoc, TSearchRequest>;
        } catch (err) {
          this.options.logger.error(
            `Error performing search in AIAssistantDataClient - ${err.message}`
          );
          throw err;
        }
      },
    };
  };

  public findAnonymizationFields = async ({
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
  }): Promise<FindAnonymizationFieldsResponse> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findAnonymizationFields({
      esClient,
      fields,
      page,
      perPage,
      filter,
      sortField,
      anonymizationFieldsIndex: this.indexTemplateAndPattern.alias,
      sortOrder: sortOrder as estypes.SortOrder,
    });
  };
}
