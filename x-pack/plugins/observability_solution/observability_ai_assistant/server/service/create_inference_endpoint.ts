/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
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
    logger.debug(`Creating inference endpoint "${AI_ASSISTANT_KB_INFERENCE_ID}"`);
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

    if (response.endpoints.length > 0) {
      return response.endpoints[0];
    }
  } catch (e) {
    logger.error(`Failed to fetch inference endpoint: ${e.message}`);
    throw e;
  }
}

export async function getInferenceEndpointStatus({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}) {
  try {
    const endpoint = await getInferenceEndpoint({ esClient, logger });
    const ready = endpoint !== undefined;
    return { ...endpoint, ready };
  } catch (error) {
    if (isInferenceEndpointMissingOrUnavailable(error)) {
      return { ready: false };
    }
    throw error;
  }
}

export function isInferenceEndpointMissingOrUnavailable(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}
