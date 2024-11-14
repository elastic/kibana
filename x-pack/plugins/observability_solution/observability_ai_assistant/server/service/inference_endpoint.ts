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

export const AI_ASSISTANT_KB_INFERENCE_ID = 'obs_ai_assistant_kb_inference';

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

    return await esClient.asCurrentUser.inference.put(
      {
        inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
        task_type: 'sparse_embedding',
        inference_config: {
          service: 'elasticsearch',
          service_settings: {
            model_id: modelId,
            adaptive_allocations: { enabled: true },
            num_threads: 1,
          },
          task_settings: {},
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
    const response = await esClient.asCurrentUser.inference.delete({
      inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
      force: true,
    });

    return response;
  } catch (e) {
    logger.error(`Failed to delete inference endpoint: ${e.message}`);
    throw e;
  }
}

export async function getInferenceEndpoint({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}) {
  try {
    const response = await esClient.asInternalUser.inference.get({
      inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
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
