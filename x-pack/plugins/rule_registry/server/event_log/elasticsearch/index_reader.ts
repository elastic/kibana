/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { estypes } from '@elastic/elasticsearch';
import { Logger, ElasticsearchClient } from 'src/core/server';

interface ConstructorParams {
  indexName: string;
  elasticsearch: Promise<ElasticsearchClient>;
  logger: Logger;
}

export type IIndexReader = PublicMethodsOf<IndexReader>;

export class IndexReader {
  private readonly indexName: string;
  private readonly elasticsearch: Promise<ElasticsearchClient>;
  private readonly logger: Logger;

  constructor(params: ConstructorParams) {
    this.indexName = params.indexName;
    this.elasticsearch = params.elasticsearch;
    this.logger = params.logger.get('IndexReader');
  }

  public async search<TDocument>(request: estypes.SearchRequest) {
    const requestToSend: estypes.SearchRequest = {
      ...request,
      index: this.indexName,
    };

    this.logger.debug(`Searching; request: ${JSON.stringify(requestToSend, null)}`);

    const esClient = await this.elasticsearch;
    const response = await esClient.search<TDocument>(requestToSend);

    return response;
  }
}
