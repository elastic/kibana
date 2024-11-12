/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import moment from 'moment';

export const AI_ASSISTANT_KB_INFERENCE_ID = 'ai_assistant_kb_inference';

export interface CreateInferenceEndpointResponse {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings: { num_allocations: number; num_threads: number; model_id: string };
  chunking_settings: { strategy: string; max_chunk_size: number; sentence_overlap: number };
}

export async function createInferenceEndpoint({
  esClient,
  logger,
  modelId = '.elser_model_2',
}: {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
  modelId: string | undefined;
}) {
  try {
    logger.debug(`Creating inference endpoint "${AI_ASSISTANT_KB_INFERENCE_ID}"`);
    return await esClient.asCurrentUser.transport.request<CreateInferenceEndpointResponse>(
      {
        method: 'PUT',
        path: `_inference/sparse_embedding/${AI_ASSISTANT_KB_INFERENCE_ID}`,
        body: {
          service: 'elasticsearch',
          service_settings: {
            model_id: modelId,
            num_allocations: 1,
            num_threads: 1,
          },
        },
      },
      {
        requestTimeout: moment.duration(2, 'minutes').asMilliseconds(),
      }
    );
  } catch (e) {
    logger.error(
      `Failed to create inference endpoint "${AI_ASSISTANT_KB_INFERENCE_ID}": ${e.message}`
    );
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

export interface InferenceEndpointResponse {
  endpoints: Array<{
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

    if (response.endpoints.length > 0) {
      return response.endpoints[0];
    }
  } catch (e) {
    logger.error(`Failed to fetch inference endpoint: ${e.message}`);
    throw e;
  }
}

export function isInferenceEndpointMissingOrUnavailable(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}
