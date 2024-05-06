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
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';
export class AIAssistantKnowledgeBaseDataClient extends AIAssistantDataClient {
  private isInstallingElser: boolean = false;

  constructor(public readonly options: AIAssistantDataClientParams) {
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
   * Downloads and deploys ELSER (if not already) by means of the _inference API, then loads ES|QL docs
   *
   * @param options
   * @param options.elserId ID of the recommended ELSER model
   * @returns Promise<void>
   */
  public setupKnowledgeBase = async ({
    elserId,
    esClient,
    esStore,
  }: {
    elserId: string;
    esClient: ElasticsearchClient;
    esStore: ElasticsearchStore;
  }): Promise<void> => {
    if (this.isInstallingElser) {
      return;
    }

    this.isInstallingElser = true;
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
      // Temporarily use esClient for current user until `kibana_system` user has `inference_admin` role
      // See https://github.com/elastic/elasticsearch/pull/108262
      // const esClient = await this.options.elasticsearchClientPromise;
      const elserResponse = await esClient.inference.putModel({
        inference_id: 'elser_model_2',
        task_type: 'sparse_embedding',
        model_config: {
          service: 'elser',
          service_settings: {
            model_id: elserId,
            num_allocations: 1,
            num_threads: 1,
          },
          task_settings: {},
        },
      });

      this.options.logger.debug(`elser response:\n: ${JSON.stringify(elserResponse, null, 2)}`);
    } catch (e) {
      this.options.logger.error(`Error setting up ELSER model: ${e.message}`);
    }
  };
}
