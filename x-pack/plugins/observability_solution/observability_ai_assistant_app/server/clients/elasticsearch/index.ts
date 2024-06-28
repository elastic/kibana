/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { withSpan } from '@kbn/apm-utils';

type AIAssistantSearchRequest = ESSearchRequest & {
  index: string;
  track_total_hits: number | boolean;
  size: number | boolean;
};

export interface ObservabilityAIAssistantElasticsearchClient {
  search<
    TDocument = unknown,
    TSearchRequest extends AIAssistantSearchRequest = AIAssistantSearchRequest
  >(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
}

export function createElasticsearchClient({
  client,
  inspect,
  logger,
}: {
  client: ElasticsearchClient;
  inspect: boolean;
  logger: Logger;
}): ObservabilityAIAssistantElasticsearchClient {
  return {
    search<
      TDocument = unknown,
      TSearchRequest extends AIAssistantSearchRequest = AIAssistantSearchRequest
    >(operationName: string, parameters: AIAssistantSearchRequest) {
      if (inspect) {
        logger.info(`Request (${operationName}):\n${JSON.stringify(parameters, null, 2)}`);
      }
      return withSpan(
        {
          name: operationName,
          labels: {
            plugin: 'observability_ai_assistant_app',
          },
        },
        () => {
          return client.search<TDocument>(parameters) as unknown as Promise<
            InferSearchResponseOf<TDocument, TSearchRequest>
          >;
        }
      ).then((response) => {
        if (inspect) {
          logger.info(`Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);
        }
        return response;
      });
    },
  };
}
