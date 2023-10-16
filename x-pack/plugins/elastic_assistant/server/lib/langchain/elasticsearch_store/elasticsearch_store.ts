/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'langchain/document';
import { Callbacks } from 'langchain/callbacks';
import { VectorStore } from 'langchain/vectorstores/base';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  MappingTypeMapping,
  QueryDslTextExpansionQuery,
} from '@elastic/elasticsearch/lib/api/types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import * as uuid from 'uuid';
import { ElasticsearchEmbeddings } from '../embeddings/elasticsearch_embeddings';
import {
  KNOWLEDGE_BASE_INDEX_PATTERN,
  KNOWLEDGE_BASE_INGEST_PIPELINE,
} from '../../../routes/knowledge_base/constants';

interface CreatePipelineParams {
  id?: string;
  description?: string;
}

interface CreateIndexParams {
  index?: string;
  pipeline?: string;
}

/**
 * Basic ElasticsearchStore implementation only leveraging ELSER for storage and retrieval.
 */
export class ElasticsearchStore extends VectorStore {
  declare FilterType: QueryDslQueryContainer;

  // Note: convert to { Client } from '@elastic/elasticsearch' for langchain contribution (removing Kibana dependency)
  private readonly esClient: ElasticsearchClient;
  private readonly index: string;
  private readonly logger: Logger;
  private readonly model: string;

  _vectorstoreType(): string {
    return 'elasticsearch';
  }

  constructor(esClient: ElasticsearchClient, index: string, logger: Logger, model?: string) {
    super(new ElasticsearchEmbeddings(logger), { esClient, index });
    this.esClient = esClient;
    this.index = index ?? KNOWLEDGE_BASE_INDEX_PATTERN;
    this.logger = logger;
    this.model = model ?? '.elser_model_2';
  }

  /**
   * Add documents to the store. Embeddings are created on ingest into index configured with
   * ELSER ingest pipeline. Returns a list of document IDs.
   *
   * @param documents Documents to add to the store
   * @param options Any additional options as defined in the interface
   * @returns Promise<string[]> of document IDs added to the store
   */
  addDocuments = async (
    documents: Document[],
    options?: Record<string, never>
  ): Promise<string[]> => {
    const pipelineExists = await this.pipelineExists();
    if (!pipelineExists) {
      await this.createPipeline();
    }
    const indexExists = await this.indexExists();
    if (!indexExists) {
      await this.createIndex();
    }

    const operations = documents.flatMap(({ pageContent, metadata }) => [
      { index: { _index: this.index, _id: uuid.v4() } },
      { text: pageContent, metadata },
    ]);

    try {
      const response = await this.esClient.bulk({ refresh: true, operations });
      this.logger.debug(`Add Documents Response:\n ${JSON.stringify(response)}`);

      const errorIds = response.items.filter((i) => i.index?.error != null);
      operations.forEach((op, i) => {
        if (errorIds.some((e) => e.index?._id === op.index?._id)) {
          this.logger.error(`Error adding document to KB: ${JSON.stringify(operations?.[i + 1])}`);
        }
      });

      return response.items.flatMap((i) =>
        i.index?._id != null && i.index.error == null ? [i.index._id] : []
      );
    } catch (e) {
      this.logger.error('Error loading data into KB', e);
      return [];
    }
  };

  /**
   * Add vectors to the store. Returns a list of document IDs.
   *
   * @param vectors Vector representation of documents to add to the store
   * @param documents Documents corresponding to the provided vectors
   * @param options Any additional options as defined in the interface
   * @returns Promise<string[]> of document IDs added to the store
   */
  addVectors = (
    vectors: number[][],
    documents: Document[],
    options?: {}
  ): Promise<string[] | void> => {
    // Note: implement if/when needed
    this.logger.info('ElasticsearchStore.addVectors not implemented');
    return Promise.resolve(undefined);
  };

  /**
   * Performs similarity search on the store using the provided query vector and filter, returning k similar
   * documents along with their score.
   *
   * @param query Query vector to search with
   * @param k Number of similar documents to return
   * @param filter Optional filter to apply to the search
   *
   *  @returns Promise<Array<[Document, number]>> of similar documents and their scores
   */
  similaritySearchVectorWithScore = (
    query: number[],
    k: number,
    filter?: this['FilterType']
  ): Promise<Array<[Document, number]>> => {
    // Note: Implement if needed
    this.logger.info('ElasticsearchStore.similaritySearchVectorWithScore not implemented');
    return Promise.resolve([]);
  };

  // Non-abstract function overrides

  /**
   * Performs similarity search on the store using the provided query string and filter, returning k similar
   * @param query Query vector to search with
   * @param k Number of similar documents to return
   * @param filter Optional filter to apply to the search
   * @param _callbacks Optional callbacks
   *
   * @returns Promise<Document[]> of similar documents
   */
  similaritySearch = async (
    query: string,
    k?: number,
    filter?: this['FilterType'] | undefined,
    _callbacks?: Callbacks | undefined
  ): Promise<Document[]> => {
    const queryBody: QueryDslQueryContainer = {
      bool: {
        must: [
          {
            text_expansion: {
              'vector.tokens': {
                model_id: this.model,
                model_text: query,
              },
            } as unknown as QueryDslTextExpansionQuery,
          },
        ],
        filter,
      },
    };

    try {
      const result = await this.esClient.search<{
        text: string;
        metadata: Record<string, unknown>;
      }>({
        index: this.index,
        size: k,
        query: queryBody,
      });

      const results = result.hits.hits.map(
        (hit) =>
          new Document({
            pageContent: hit?._source?.text ?? '',
            metadata: hit?._source?.metadata,
          })
      );

      this.logger.debug(`Similarity Search Query:\n ${JSON.stringify(queryBody)}`);
      this.logger.debug(`Similarity Search Results:\n ${JSON.stringify(results)}`);

      return results;
    } catch (e) {
      this.logger.error(e);
      return [];
    }
  };

  // ElasticsearchStore explicit utility functions

  /**
   * Checks if the provided index exists in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the index exists
   * @param index Index to check
   * @returns Promise<boolean> indicating whether the index exists
   */
  indexExists = async (index?: string): Promise<boolean> => {
    return this.esClient.indices.exists({ index: index ?? this.index });
  };

  /**
   * Create index for ELSER embeddings in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the index was created
   */
  createIndex = async ({ index, pipeline }: CreateIndexParams = {}): Promise<boolean> => {
    const mappings: MappingTypeMapping = {
      properties: {
        vector: {
          properties: { tokens: { type: 'rank_features' } },
        },
      },
    };

    const settings = { default_pipeline: pipeline ?? KNOWLEDGE_BASE_INGEST_PIPELINE };

    const response = await this.esClient.indices.create({
      index: index ?? this.index,
      mappings,
      settings,
    });

    return response.acknowledged;
  };

  /**
   * Delete index for ELSER embeddings in Elasticsearch
   * @param index Index to delete, otherwise uses the default index
   *
   * @returns Promise<boolean> indicating whether the index was created
   */
  deleteIndex = async (index?: string): Promise<boolean> => {
    const response = await this.esClient.indices.delete({
      index: index ?? this.index,
    });

    return response.acknowledged;
  };

  /**
   * Checks if the provided ingest pipeline exists in Elasticsearch
   *
   * @param pipelineId ID of the ingest pipeline to check
   * @returns Promise<boolean> indicating whether the pipeline exists
   */
  pipelineExists = async (pipelineId?: string): Promise<boolean> => {
    try {
      const response = await this.esClient.ingest.getPipeline({
        id: KNOWLEDGE_BASE_INGEST_PIPELINE,
      });
      return Object.keys(response).length > 0;
    } catch (e) {
      // The GET /_ingest/pipeline/{pipelineId} API returns an empty object w/ 404 Not Found.
      return false;
    }
  };

  /**
   * Create ingest pipeline for ELSER in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the pipeline was created
   */
  createPipeline = async ({ id, description }: CreatePipelineParams = {}): Promise<boolean> => {
    const response = await this.esClient.ingest.putPipeline({
      id: id ?? KNOWLEDGE_BASE_INGEST_PIPELINE,
      description:
        description ?? 'Embedding pipeline for Elastic AI Assistant ELSER Knowledge Base',
      processors: [
        {
          inference: {
            model_id: this.model,
            target_field: 'vector',
            field_map: {
              text: 'text_field',
            },
            inference_config: {
              // @ts-expect-error
              text_expansion: {
                results_field: 'tokens',
              },
            },
          },
        },
      ],
    });

    return response.acknowledged;
  };

  /**
   * Delete ingest pipeline for ELSER in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the pipeline was created
   */
  deletePipeline = async (pipelineId?: string): Promise<boolean> => {
    const response = await this.esClient.ingest.deletePipeline({
      id: pipelineId ?? KNOWLEDGE_BASE_INGEST_PIPELINE,
    });

    return response.acknowledged;
  };

  /**
   * Checks if the provided model is installed in Elasticsearch
   *
   * @param modelId ID of the model to check
   * @returns Promise<boolean> indicating whether the model is installed
   */
  async isModelInstalled(modelId: string): Promise<boolean> {
    try {
      const getResponse = await this.esClient.ml.getTrainedModels({
        model_id: modelId,
        include: 'definition_status',
      });

      return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
    } catch (e) {
      // Returns 404 if it doesn't exist
      return false;
    }
  }
}
