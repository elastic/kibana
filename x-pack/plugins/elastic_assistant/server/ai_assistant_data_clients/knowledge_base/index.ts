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
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';
import { GetElser } from '../../types';

interface KnowledgeBaseDataClientParams extends AIAssistantDataClientParams {
  ml: MlPluginSetup;
  getElserId: GetElser;
}
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
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
    if (this.isInstallingElser) {
      return;
    }
    // TODO: Before automatically installing ELSER in the background, we should perform the following deployment resource checks
    // Note: ESS only, as Serverless can always auto-install if `productTier === complete`
    // 1. Deployment has ML Nodes with adequate free memory
    //    We can just auto-install, yay!
    // 2. Deployment doesn't have adequate ML resources, and ML Autoscaling is disabled (or unavailable due to cluster health).
    //    Refer the user to the docs for further details
    // 3. Deployment doesn't have adequate ML resources, but have ML Autoscaling enabled and scale limits are are NOT WITHIN the required resources.
    //    Again, refer the user to the docs
    // 4. Deployment doesn't have adequate ML resources, but have ML Autoscaling enabled and scale limits ARE WITHIN the required resources.
    //    In this instance we could auto-install, but may have it behind a user action since deployment costs would change...

    this.isInstallingElser = true;
    const elserId = await this.options.getElserId();
    const isInstalled = await this.isModelInstalled(elserId);

    if (isInstalled) {
      this.options.logger.debug(`ELSER model '${elserId}' is already installed`);
      this.options.logger.debug(`Loading KB docs!`);
      const loadedKnowledgeBase = await loadESQL(esStore, this.options.logger);
      this.options.logger.debug(`${loadedKnowledgeBase}`);
      this.isInstallingElser = false;

      return;
    }

    try {
      const elserResponse = await this.options.ml
        .trainedModelsProvider({} as KibanaRequest, {} as SavedObjectsClientContract)
        .installElasticModel(elserId);

      // const esClient = await this.options.elasticsearchClientPromise;

      this.options.logger.debug(`elser response:\n: ${JSON.stringify(elserResponse, null, 2)}`);
    } catch (e) {
      this.options.logger.error(`Error setting up ELSER model: ${e.message}`);
    }
  };

  public addKnowledgeBaseResource = async ({
    document,
    authenticatedUser,
  }: {
    document: Document;
    authenticatedUser: AuthenticatedUser;
  }): Promise<void> => {};
}
