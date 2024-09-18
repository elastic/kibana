/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
  ReadKnowledgeBaseRequestParams,
  ReadKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { KibanaRequest } from '@kbn/core/server';
import { getKbResource } from './get_kb_resource';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';
import { ESQL_RESOURCE } from './constants';
import { isV2KnowledgeBaseEnabled } from '../helpers';

/**
 * Get the status of the Knowledge Base index, pipeline, and resources (collection of documents)
 *
 * @param router IRouter for registering routes
 */
export const getKnowledgeBaseStatusRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
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
            params: buildRouteValidationWithZod(ReadKnowledgeBaseRequestParams),
          },
        },
      },
      async (context, request: KibanaRequest<ReadKnowledgeBaseRequestParams>, response) => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger = ctx.elasticAssistant.logger;

        try {
          // Use asInternalUser
          const kbResource = getKbResource(request);

          // FF Check for V2 KB
          const v2KnowledgeBaseEnabled = isV2KnowledgeBaseEnabled({ context: ctx, request });

          const kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient({
            v2KnowledgeBaseEnabled,
          });
          if (!kbDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          const indexExists = true; // Installed at startup, always true
          const pipelineExists = true; // Installed at startup, always true
          const modelExists = await kbDataClient.isModelInstalled();
          const setupAvailable = await kbDataClient.isSetupAvailable();

          const body: ReadKnowledgeBaseResponse = {
            elser_exists: modelExists,
            index_exists: indexExists,
            is_setup_in_progress: kbDataClient.isSetupInProgress,
            is_setup_available: setupAvailable,
            pipeline_exists: pipelineExists,
          };

          if (indexExists && kbResource === ESQL_RESOURCE) {
            const esqlExists = await kbDataClient.isESQLDocsLoaded();
            return response.ok({ body: { ...body, esql_exists: esqlExists } });
          }

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
