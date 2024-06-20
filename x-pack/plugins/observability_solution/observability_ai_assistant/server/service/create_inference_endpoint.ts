/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';

export const AI_ASSISTANT_KB_INFERENCE_ID = 'ai_assistant_kb_inference';

export async function createInferenceEndpoint({
  esClient,
  logger,
}: {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
}) {
  try {
    const response = await esClient.asCurrentUser.transport.request({
      method: 'PUT',
      path: `_inference/sparse_embedding/${AI_ASSISTANT_KB_INFERENCE_ID}`,
      body: {
        service: 'elser',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
        },
      },
    });

    return response;
  } catch (e) {
    logger.error(`Failed to create inference endpoint: ${e.message}`);
    throw e;
  }
}

export async function deleteInferenceEndpoint({
  esClient,
  logger,
}: {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
}) {
  try {
    const response = await esClient.asCurrentUser.transport.request({
      method: 'DELETE',
      path: `_inference/sparse_embedding/${AI_ASSISTANT_KB_INFERENCE_ID}`,
      querystring: {
        force: true, // Deletes the endpoint regardless if it’s used in an inference pipeline or a in a semantic_text field.
      },
    });

    return response;
  } catch (e) {
    logger.error(`Failed to delete inference endpoint: ${e.message}`);
    throw e;
  }
}

interface InferenceEndpointResponse {
  endpoints: Array<{
    model_id: string;
    task_type: string;
    service: string;
    service_settings: {
      num_allocations: number;
      num_threads: number;
      model_id: string;
    };
    task_settings: {};
  }>;
}

export async function getInferenceEndpoint({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}) {
  try {
    const response = await esClient.asInternalUser.transport.request<InferenceEndpointResponse>({
      method: 'GET',
      path: `_inference/sparse_embedding/${AI_ASSISTANT_KB_INFERENCE_ID}`,
    });

    return response;
  } catch (e) {
    logger.error(`Failed to fetch inference endpoint: ${e.message}`);
    throw e;
  }
}
