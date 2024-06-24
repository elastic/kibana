/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  MappingTypeMapping,
  MlTrainedModelDeploymentNodesStats,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { Document } from 'langchain/document';
import { VectorStore } from '@langchain/core/vectorstores';
import * as uuid from 'uuid';

import { Metadata } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ElasticsearchEmbeddings } from '../embeddings/elasticsearch_embeddings';
import { FlattenedHit, getFlattenedHits } from './helpers/get_flattened_hits';
import { getMsearchQueryBody } from './helpers/get_msearch_query_body';
import { getTermsSearchQuery } from './helpers/get_terms_search_query';
import { getVectorSearchQuery } from './helpers/get_vector_search_query';
import type { MsearchResponse } from './helpers/types';
import {
  ESQL_RESOURCE,
  KNOWLEDGE_BASE_INDEX_PATTERN,
  KNOWLEDGE_BASE_INGEST_PIPELINE,
} from '../../../routes/knowledge_base/constants';
import { getRequiredKbDocsTermsQueryDsl } from './helpers/get_required_kb_docs_terms_query_dsl';
import {
  KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT,
  KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT,
} from '../../telemetry/event_based_telemetry';
import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';

interface CreatePipelineParams {
  id?: string;
  description?: string;
}

interface CreateIndexParams {
  index?: string;
  pipeline?: string;
}

/**
 * A fallback for the query `size` that determines how many documents to
 * return from Elasticsearch when performing a similarity search.
 *
 * The size is typically determined by the implementation of LangChain's
 * `VectorStoreRetriever._getRelevantDocuments` function, so this fallback is
 * only required when using the `ElasticsearchStore` directly.
 */
export const FALLBACK_SIMILARITY_SEARCH_SIZE = 10;

/** The maximum number of hits to return from a `terms` query, via the `size` parameter */
export const TERMS_QUERY_SIZE = 10000;

/**
 * Basic ElasticsearchStore implementation only leveraging ELSER for storage and retrieval.
 */
export class ElasticsearchStore extends VectorStore {
  declare FilterType: QueryDslQueryContainer;

  private readonly esClient: ElasticsearchClient;
  private readonly kbDataClient: AIAssistantKnowledgeBaseDataClient | undefined;
  private readonly index: string;
  private readonly logger: Logger;
  private readonly telemetry: AnalyticsServiceSetup;
  private readonly model: string;
  private readonly kbResource: string;

  _vectorstoreType(): string {
    return 'elasticsearch';
  }

  constructor(
    esClient: ElasticsearchClient,
    index: string,
    logger: Logger,
    telemetry: AnalyticsServiceSetup,
    model?: string,
    kbResource?: string | undefined,
    kbDataClient?: AIAssistantKnowledgeBaseDataClient
  ) {
    super(new ElasticsearchEmbeddings(logger), { esClient, index });
    this.esClient = esClient;
    this.index = index ?? KNOWLEDGE_BASE_INDEX_PATTERN;
    this.logger = logger;
    this.telemetry = telemetry;
    this.model = model ?? '.elser_model_2';
    this.kbResource = kbResource ?? ESQL_RESOURCE;
    this.kbDataClient = kbDataClient;
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
    documents: Array<Document<Metadata>>,
    options?: Record<string, never>
  ): Promise<string[]> => {
    // Code path for when `assistantKnowledgeBaseByDefault` FF is enabled
    // Once removed replace addDocuments() w/ addDocumentsViaDataClient()
    if (this.kbDataClient != null) {
      return this.addDocumentsViaDataClient(documents, options);
    }

    const pipelineExists = await this.pipelineExists();
    if (!pipelineExists) {
      await this.createPipeline();
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
      this.logger.error(`Error loading data into KB\n ${e}`);
      return [];
    }
  };

  addDocumentsViaDataClient = async (
    documents: Array<Document<Metadata>>,
    options?: Record<string, never>
  ): Promise<string[]> => {
    if (!this.kbDataClient) {
      this.logger.error('No kbDataClient provided');
      return [];
    }

    try {
      const response = await this.kbDataClient.addKnowledgeBaseDocuments({
        documents,
      });
      return response.map((doc) => doc.id);
    } catch (e) {
      this.logger.error(`Error loading data into KB\n ${e}`);
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
   * Fun facts:
   * - This function is called by LangChain's `VectorStoreRetriever._getRelevantDocuments`
   * - The `k` parameter is typically determined by LangChain's `VectorStoreRetriever._getRelevantDocuments`, and has been observed to default to `4` in the wild (see langchain/dist/vectorstores/base.ts)
   * @returns Promise<Document[]> of similar documents
   */
  similaritySearch = async (
    query: string,
    k?: number,
    filter?: this['FilterType'] | undefined,
    _callbacks?: Callbacks | undefined
  ): Promise<Document[]> => {
    // requiredDocs is an array of filters that can be used in a `bool` Elasticsearch DSL query to filter in/out required KB documents:
    const requiredDocs = getRequiredKbDocsTermsQueryDsl(this.kbResource);

    // The `k` parameter is typically provided by LangChain's `VectorStoreRetriever._getRelevantDocuments`, which calls this function:
    const vectorSearchQuerySize = k ?? FALLBACK_SIMILARITY_SEARCH_SIZE;

    // build a vector search query:
    const vectorSearchQuery = getVectorSearchQuery({
      filter,
      modelId: this.model,
      mustNotTerms: requiredDocs,
      query,
    });

    // build a (separate) terms search query:
    const termsSearchQuery = getTermsSearchQuery(requiredDocs);

    // combine the vector search query and the terms search queries into a single multi-search query:
    const mSearchQueryBody = getMsearchQueryBody({
      index: this.index,
      termsSearchQuery,
      termsSearchQuerySize: TERMS_QUERY_SIZE,
      vectorSearchQuery,
      vectorSearchQuerySize,
    });

    try {
      // execute both queries via a single multi-search request:
      const result = await this.esClient.msearch<MsearchResponse>(mSearchQueryBody);

      // flatten the results of the combined queries into a single array of hits:
      const results: FlattenedHit[] = result.responses.flatMap((response) => {
        const maybeEsqlMsearchResponse: MsearchResponse = response as MsearchResponse;

        return getFlattenedHits(maybeEsqlMsearchResponse);
      });

      this.telemetry.reportEvent(KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT.eventType, {
        model: this.model,
        resourceAccessed: this.kbResource,
        resultCount: results.length,
        responseTime: result.took ?? 0,
      });

      this.logger.debug(
        `Similarity search metadata source:\n${JSON.stringify(
          results.map((r) => r?.metadata?.source ?? '(missing metadata.source)'),
          null,
          2
        )}`
      );

      return results;
    } catch (e) {
      const error = transformError(e);
      this.telemetry.reportEvent(KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT.eventType, {
        model: this.model,
        resourceAccessed: this.kbResource,
        errorMessage: error.message,
      });
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
        metadata: {
          properties: {
            /** the category of knowledge, e.g. `esql` */
            kbResource: { type: 'keyword' },
            /** when `true`, return this document in all searches for the `kbResource` */
            required: { type: 'boolean' },
            /** often a file path when the document was created via a LangChain `DirectoryLoader`, this metadata describes the origin of the document */
            source: { type: 'keyword' },
          },
        },
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
    // Code path for when `assistantKnowledgeBaseByDefault` FF is enabled
    // We won't be supporting delete operations for the KB data stream going forward, so this can be removed along with the FF
    if (this.kbDataClient != null) {
      const response = await this.esClient.indices.deleteDataStream({ name: index ?? this.index });
      return response.acknowledged;
    }

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
      const id =
        pipelineId ??
        this.kbDataClient?.options.ingestPipelineResourceName ??
        KNOWLEDGE_BASE_INGEST_PIPELINE;
      const response = await this.esClient.ingest.getPipeline({
        id,
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
      id:
        id ??
        this.kbDataClient?.options.ingestPipelineResourceName ??
        KNOWLEDGE_BASE_INGEST_PIPELINE,
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
      id:
        pipelineId ??
        this.kbDataClient?.options.ingestPipelineResourceName ??
        KNOWLEDGE_BASE_INGEST_PIPELINE,
    });

    return response.acknowledged;
  };

  /**
   * Checks if the provided model is installed in Elasticsearch
   *
   * @param modelId ID of the model to check
   * @returns Promise<boolean> indicating whether the model is installed
   */
  async isModelInstalled(modelId?: string): Promise<boolean> {
    try {
      // Code path for when `assistantKnowledgeBaseByDefault` FF is enabled
      if (this.kbDataClient != null) {
        // esStore.isModelInstalled() is actually checking if the model is deployed, not installed, so do that instead
        return this.kbDataClient.isModelDeployed();
      }

      const getResponse = await this.esClient.ml.getTrainedModelsStats({
        model_id: modelId ?? this.model,
      });

      this.logger.debug(`modelId: ${modelId}`);

      // For standardized way of checking deployment status see: https://github.com/elastic/elasticsearch/issues/106986
      const isReadyESS = (stats: MlTrainedModelStats) =>
        stats.deployment_stats?.state === 'started' &&
        stats.deployment_stats?.allocation_status.state === 'fully_allocated';

      const isReadyServerless = (stats: MlTrainedModelStats) =>
        (stats.deployment_stats?.nodes as unknown as MlTrainedModelDeploymentNodesStats[]).some(
          (node) => node.routing_state.routing_state === 'started'
        );

      return getResponse.trained_model_stats.some(
        (stats) => isReadyESS(stats) || isReadyServerless(stats)
      );
    } catch (e) {
      // Returns 404 if it doesn't exist
      return false;
    }
  }
}
