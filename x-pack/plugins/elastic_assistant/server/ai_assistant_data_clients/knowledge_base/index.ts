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
import pRetry from 'p-retry';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';
import { GetElser } from '../../types';
import { transformToCreateSchema } from './create_knowledge_base_entry';
import { EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';
import { ESQL_DOCS_LOADED_QUERY } from '../../routes/knowledge_base/constants';
import { isModelAlreadyExistsError } from './helpers';

interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  private setupInProgress: boolean = false;

  constructor(public readonly options: KnowledgeBaseDataClientParams) {
    super(options);
  }

  /**
   * Downloads and installs ELSER model if not already installed
   *
   * @param soClient SavedObjectsClientContract for installing ELSER so that ML SO's are in sync
   */
  private installModel = async ({ soClient }: { soClient: SavedObjectsClientContract }) => {
    try {
      this.setupInProgress = true;
      const elserId = await this.options.getElserId();
      const elserResponse = await this.options.ml
        // TODO: See about calling `installElasticModel()` as systemUser as to not require soClient
        .trainedModelsProvider({} as KibanaRequest, soClient)
        .installElasticModel(elserId);

      this.options.logger.debug(
        `installElasticModel response:\n: ${JSON.stringify(elserResponse, null, 2)}`
      );
    } catch (e) {
      this.options.logger.error(`Error setting up ELSER model: ${e.message}`);
      this.setupInProgress = false;
    }
  };

  /**
   * Returns whether ELSER is installed/ready to deploy
   *
   * @returns Promise<boolean> indicating whether the model is installed
   */
  private isModelInstalled = async (): Promise<boolean> => {
    const elserId = await this.options.getElserId();
    try {
      const esClient = await this.options.elasticsearchClientPromise;
      const getResponse = await esClient.ml.getTrainedModels({
        model_id: elserId,
        include: 'definition_status',
      });
      this.options.logger.debug(
        `Model definition status:\n${JSON.stringify(getResponse.trained_model_configs[0])}`
      );
      return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
    } catch (error) {
      if (!isModelAlreadyExistsError(error)) {
        this.options.logger.error(`Error deploying ELSER model '${elserId}'\n${error}`);
      }
      this.options.logger.debug(`Error deploying ELSER model '${elserId}', model already deployed`);
      this.setupInProgress = false;
      return false;
    }
  };

  /**
   * Deploy the ELSER model with default configuration
   */
  private deployModel = async () => {
    const elserId = await this.options.getElserId();
    try {
      this.setupInProgress = true;
      const esClient = await this.options.elasticsearchClientPromise;
      await esClient.ml.startTrainedModelDeployment({
        model_id: elserId,
        wait_for: 'fully_allocated',
      });
    } catch (error) {
      if (!isModelAlreadyExistsError(error)) {
        this.options.logger.error(`Error deploying ELSER model '${elserId}'\n${error}`);
      }
      this.options.logger.debug(`Error deploying ELSER model '${elserId}', model already deployed`);
      this.setupInProgress = false;
    }
  };

  /**
   * Checks if the provided model is deployed and allocated in Elasticsearch
   *
   * @returns Promise<boolean> indicating whether the model is deployed
   */
  private isModelDeployed = async (): Promise<boolean> => {
    const elserId = await this.options.getElserId();
    const esClient = await this.options.elasticsearchClientPromise;

    try {
      const getResponse = await esClient.ml.getTrainedModelsStats({
        model_id: elserId,
      });

      this.options.logger.debug(`modelId: ${elserId}`);

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
   * NOTE: Before automatically installing ELSER in the background, we should perform deployment resource checks
   * Only necessary for ESS, as Serverless can always auto-install if `productTier === complete`
   * See ml-team issue for providing 'dry run' flag to perform these checks: https://github.com/elastic/ml-team/issues/1208
   *
   * @param options
   * @param options.esStore ElasticsearchStore for loading ES|QL docs via LangChain loaders
   * @param options.soClient SavedObjectsClientContract for installing ELSER so that ML SO's are in sync
   *
   * @returns Promise<void>
   */
  public setupKnowledgeBase = async ({
    esStore,
    request,
    soClient,
  }: {
    esStore: ElasticsearchStore;
    request: KibanaRequest;
    soClient: SavedObjectsClientContract;
  }): Promise<void> => {
    if (this.setupInProgress) {
      this.options.logger.debug('Setup already in progress');
      return;
    }

    const elserId = await this.options.getElserId();

    try {
      const isInstalled = await this.isModelInstalled();
      if (!isInstalled) {
        await this.installModel({ soClient });
        await pRetry(
          async () =>
            (await this.isModelInstalled())
              ? Promise.resolve()
              : Promise.reject(new Error('Model not installed')),
          { minTimeout: 10000, retries: 10 }
        );
      } else {
        this.options.logger.debug(`ELSER model '${elserId}' is already installed`);
      }

      const isDeployed = await this.isModelDeployed();
      if (!isDeployed) {
        await this.deployModel();
        await pRetry(
          async () =>
            (await this.isModelDeployed())
              ? Promise.resolve()
              : Promise.reject(new Error('Model not deployed')),
          { minTimeout: 2000, retries: 10 }
        );
      } else {
        this.options.logger.debug(`ELSER model '${elserId}' is already deployed`);
      }

      const kbDocsLoaded = (await esStore.similaritySearch(ESQL_DOCS_LOADED_QUERY)).length > 0;
      if (!kbDocsLoaded) {
        this.options.logger.debug(`Loading KB docs!`);
        const loadedKnowledgeBase = await loadESQL(esStore, this.options.logger);
        this.options.logger.debug(`${loadedKnowledgeBase}`);
      } else {
        this.options.logger.debug(`KB docs already loaded!`);
      }
    } catch (e) {
      this.options.logger.error(`Error setting up Knowledge Base: ${e.message}`);
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
            perPage: 10000,
            filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
          })
        : undefined;
    this.options.logger.debug(`created: ${created?.data.hits.hits.length ?? '0'}`);
    this.options.logger.debug(`errors: ${JSON.stringify(errors, null, 2)}`);

    return created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [];
  };
}
