/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, KibanaRequest } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
} from '@kbn/elastic-assistant-common';
import {
  DeleteKnowledgeBaseRequestParams,
  DeleteKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/knowledge_base/crud_kb_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { isV2KnowledgeBaseEnabled } from '../helpers';

/**
 * Delete Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const deleteKnowledgeBaseRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .delete({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteKnowledgeBaseRequestParams),
          },
        },
      },
      async (context, request: KibanaRequest<DeleteKnowledgeBaseRequestParams>, response) => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger = ctx.elasticAssistant.logger;

        // FF Check for V2 KB
        const v2KnowledgeBaseEnabled = isV2KnowledgeBaseEnabled({ context: ctx, request });

        try {
          const knowledgeBaseDataClient =
            await assistantContext.getAIAssistantKnowledgeBaseDataClient(v2KnowledgeBaseEnabled);
          if (!knowledgeBaseDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          // TODO: This delete API is likely not needed and can be replaced by the new `entries` API
          const body: DeleteKnowledgeBaseResponse = {
            success: false,
          };

          return response.ok({ body });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
