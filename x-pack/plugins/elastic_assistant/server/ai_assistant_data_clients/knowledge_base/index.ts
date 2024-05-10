/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlTrainedModelDeploymentNodesStats,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core-security-common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Document } from 'langchain/document';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';
import { GetElser } from '../../types';
import { transformToCreateSchema } from './create_knowledge_base_entry';
import { EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';
import { ESQL_DOCS_LOADED_QUERY } from '../../routes/knowledge_base/constants';

interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  // @ts-ignore
  private isInstallingElser: boolean = false;

  constructor(public readonly options: KnowledgeBaseDataClientParams) {
    super(options);
  }

  /**
   * Checks if the provided model is installed (deployed and allocated) in Elasticsearch
   *
   * @param modelId ID of the model to check
   * @returns Promise<boolean> indicating whether the model is installed
   */
  private isModelInstalled = async (modelId: string): Promise<boolean> => {
    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const getResponse = await esClient.ml.getTrainedModelsStats({
        model_id: modelId,
      });

      this.options.logger.debug(`modelId: ${modelId}`);

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
  };

  /**
   * Downloads and deploys ELSER (if not already), then loads ES|QL docs
   *
   * @param options
   * @param options.esStore ElasticsearchStore for loading ES|QL docs
   * @returns Promise<void>
   */
  public setupKnowledgeBase = async ({
    esStore,
  }: {
    esStore: ElasticsearchStore;
  }): Promise<void> => {
    // TODO: Before automatically installing ELSER in the background, we should perform deployment resource checks
    // Note: ESS only, as Serverless can always auto-install if `productTier === complete`
    // See ml-team issue for providing 'dry run' flag to perform these checks: https://github.com/elastic/ml-team/issues/1208
    const elserId = await this.options.getElserId();
    const isInstalled = await this.isModelInstalled(elserId);

    if (isInstalled) {
      this.isInstallingElser = false;
      this.options.logger.debug(`ELSER model '${elserId}' is already installed`);

      const esqlExists = (await esStore.similaritySearch(ESQL_DOCS_LOADED_QUERY)).length > 0;
      if (esqlExists) {
        this.options.logger.debug(`Kb docs already loaded!`);
        return;
      } else {
        this.options.logger.debug(`Loading KB docs!`);
        const loadedKnowledgeBase = await loadESQL(esStore, this.options.logger);
        this.options.logger.debug(`${loadedKnowledgeBase}`);
        this.isInstallingElser = false;
      }

      return;
    }

    try {
      this.isInstallingElser = true;
      const elserResponse = await this.options.ml
        .trainedModelsProvider({} as KibanaRequest, {} as SavedObjectsClientContract)
        .installElasticModel(elserId);

      this.options.logger.debug(`elser response:\n: ${JSON.stringify(elserResponse, null, 2)}`);
    } catch (e) {
      this.options.logger.error(`Error setting up ELSER model: ${e.message}`);
    }
  };

  /**
   * Adds LangChain Documents to the knowledge base
   *
   * @param documents
   * @param authenticatedUser
   */
  public addKnowledgeBaseDocuments = async ({
    documents,
    authenticatedUser,
  }: {
    documents: Document[];
    authenticatedUser: AuthenticatedUser;
  }): Promise<KnowledgeBaseEntryResponse[]> => {
    const writer = await this.getWriter();
    const changedAt = new Date().toISOString();
    // @ts-ignore
    const { errors, docs_created: docsCreated } = await writer.bulk({
      documentsToCreate: documents.map((doc) =>
        transformToCreateSchema(changedAt, this.spaceId, authenticatedUser, {
          // TODO: Update the LangChain Document Metadata type extension
          metadata: {
            kbResource: doc.metadata.kbResourcer ?? 'unknown',
            required: doc.metadata.required ?? false,
            source: doc.metadata.source ?? 'unknown',
          },
          text: doc.pageContent,
        })
      ),
      authenticatedUser,
    });
    const created =
      docsCreated.length > 0
        ? await this.findDocuments<EsKnowledgeBaseEntrySchema>({
            page: 1,
            perPage: 100,
            filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
          })
        : undefined;
    this.options.logger.debug(`created: ${created}`);
    this.options.logger.debug(`errors: ${errors}`);

    return created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [];
  };
}
