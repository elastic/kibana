/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Embeddings } from 'langchain/embeddings/base';
import { EmbeddingsParams } from 'langchain/dist/embeddings/base';
import { Logger } from '@kbn/core/server';

/**
 * Shell class for Elasticsearch embeddings as not needed in ElasticsearchStore since ELSER embeds on index
 */
export class ElasticsearchEmbeddings extends Embeddings {
  private readonly logger: Logger;
  constructor(logger: Logger, params?: EmbeddingsParams) {
    super(params ?? {});
    this.logger = logger;
  }

  /**
   * TODO: Use inference API if not re-indexing to create embedding vectors, e.g.
   *
   * POST _ml/trained_models/.elser_model_2/_infer
   * {
   *   "docs":[{"text_field": "The fool doth think he is wise, but the wise man knows himself to be a fool."}]
   * }
   */

  embedDocuments(documents: string[]): Promise<number[][]> {
    // Note: implement if/when needed
    this.logger.info('ElasticsearchEmbeddings.embedDocuments not implemented');
    return Promise.resolve([]);
  }

  embedQuery(_: string): Promise<number[]> {
    // Note: implement if/when needed
    this.logger.info('ElasticsearchEmbeddings.embedQuery not implemented');
    return Promise.resolve([]);
  }
}
