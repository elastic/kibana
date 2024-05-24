/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { once } from 'lodash/fp';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { knowledgeBaseIngestPipeline } from '../ai_assistant_data_clients/knowledge_base/ingest_pipeline';
import { GetElser } from '../types';

/**
 * Creates a function that returns the ELSER model ID
 *
 * @param ml
 */
export const createGetElserId = (ml: MlPluginSetup): GetElser => {
  return once(async () => {
    return (
      (
        await ml
          // Force check to happen as internal user
          .trainedModelsProvider({} as KibanaRequest, {} as SavedObjectsClientContract)
          .getELSER()
      ).model_id
    );
  });
};

interface PipelineExistsParams {
  esClient: ElasticsearchClient;
  id: string;
}

/**
 * Checks if the provided ingest pipeline exists in Elasticsearch
 *
 * @param params params
 * @param params.esClient Elasticsearch client with privileges to check for ingest pipelines
 * @param params.id ID of the ingest pipeline to check
 *
 * @returns Promise<boolean> indicating whether the pipeline exists
 */
export const pipelineExists = async ({ esClient, id }: PipelineExistsParams): Promise<boolean> => {
  try {
    const response = await esClient.ingest.getPipeline({
      id,
    });
    return Object.keys(response).length > 0;
  } catch (e) {
    // The GET /_ingest/pipeline/{pipelineId} API returns an empty object w/ 404 Not Found.
    return false;
  }
};

interface CreatePipelineParams {
  esClient: ElasticsearchClient;
  id: string;
  modelId: string;
}

/**
 * Create ingest pipeline for ELSER in Elasticsearch
 *
 * @param params params
 * @param params.esClient Elasticsearch client with privileges to check for ingest pipelines
 * @param params.id ID of the ingest pipeline
 * @param params.modelId ID of the ELSER model
 *
 * @returns Promise<boolean> indicating whether the pipeline was created
 */
export const createPipeline = async ({
  esClient,
  id,
  modelId,
}: CreatePipelineParams): Promise<boolean> => {
  try {
    const response = await esClient.ingest.putPipeline(
      knowledgeBaseIngestPipeline({
        id,
        modelId,
      })
    );

    return response.acknowledged;
  } catch (e) {
    return false;
  }
};

interface DeletePipelineParams {
  esClient: ElasticsearchClient;
  id: string;
}

/**
 * Delete ingest pipeline for ELSER in Elasticsearch
 *
 * @returns Promise<boolean> indicating whether the pipeline was created
 */
export const deletePipeline = async ({ esClient, id }: DeletePipelineParams): Promise<boolean> => {
  const response = await esClient.ingest.deletePipeline({
    id,
  });

  return response.acknowledged;
};
