/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { chunk, flatMap, get, keys } from 'lodash';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { IIndexPatternString } from '../types';
import { AssistantDataWriter } from './assistant_data_writer';
import { getIndexTemplateAndPattern } from '../ai_assistant_service/lib/conversation_configuration_type';

// Term queries can take up to 10,000 terms
const CHUNK_SIZE = 10000;

export interface AIAssistantDataClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  namespace: string;
  logger: Logger;
  indexPatternsResorceName: string;
}

export class AIAssistantDataClient {
  private writerCache: Map<string, AssistantDataWriter> = new Map();

  private indexTemplateAndPattern: IIndexPatternString;

  constructor(private readonly options: AIAssistantDataClientParams) {
    this.indexTemplateAndPattern = getIndexTemplateAndPattern(
      this.options.indexPatternsResorceName,
      this.options.namespace ?? DEFAULT_NAMESPACE_STRING
    );
  }

  public async getWriter({ namespace }: { namespace: string }): Promise<AssistantDataWriter> {
    if (this.writerCache.get(namespace)) {
      return this.writerCache.get(namespace) as AssistantDataWriter;
    }
    const indexPatterns = this.indexTemplateAndPattern;
    await this.initializeWriter(namespace, indexPatterns.alias);
    return this.writerCache.get(namespace) as AssistantDataWriter;
  }

  private async initializeWriter(namespace: string, index: string): Promise<AssistantDataWriter> {
    const esClient = await this.options.elasticsearchClientPromise;
    const writer = new AssistantDataWriter({
      esClient,
      namespace,
      index,
      logger: this.options.logger,
    });

    this.writerCache.set(namespace, writer);
    return writer;
  }
}
