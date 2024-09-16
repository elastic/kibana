/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  CreateKnowledgeBaseRequestParams,
  CreateKnowledgeBaseResponse,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';
import { isV2KnowledgeBaseEnabled } from '../helpers';

// Since we're awaiting on ELSER setup, this could take a bit (especially if ML needs to autoscale)
// Consider just returning if attempt was successful, and switch to client polling
const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

/**
 * Load Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const postKnowledgeBaseRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(CreateKnowledgeBaseRequestParams),
          },
        },
      },
      async (
        context,
        request: KibanaRequest<CreateKnowledgeBaseRequestParams>,
        response
      ): Promise<IKibanaResponse<CreateKnowledgeBaseResponse>> => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const core = ctx.core;
        const soClient = core.savedObjects.getClient();

        // FF Check for V2 KB
        const v2KnowledgeBaseEnabled = isV2KnowledgeBaseEnabled({ context: ctx, request });

        try {
          const knowledgeBaseDataClient =
            await assistantContext.getAIAssistantKnowledgeBaseDataClient(v2KnowledgeBaseEnabled);
          if (!knowledgeBaseDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          await knowledgeBaseDataClient.setupKnowledgeBase({ soClient });

          return response.ok({ body: { success: true } });
        } catch (error) {
          return resp.error({
            body: error.message,
            statusCode: 500,
          });
        }
      }
    );
};
