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
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_DOCS_LOADED_QUERY, ESQL_RESOURCE } from './constants';
import { isV2KnowledgeBaseEnabled } from '../helpers';

/**
 * Get the status of the Knowledge Base index, pipeline, and resources (collection of documents)
 *
 * @param router IRouter for registering routes
 * @param getElser Function to get the default Elser ID
 */
export const getKnowledgeBaseStatusRoute = (
  router: ElasticAssistantPluginRouter,
  getElser: GetElser
) => {
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
        const telemetry = assistantContext.telemetry;

        try {
          // Use asInternalUser
          const esClient = (await context.core).elasticsearch.client.asInternalUser;
          const elserId = await getElser();
          const kbResource = getKbResource(request);

          // FF Check for V2 KB
          const v2KnowledgeBaseEnabled = isV2KnowledgeBaseEnabled({ context: ctx, request });

          const kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient(
            v2KnowledgeBaseEnabled
          );
          if (!kbDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          // Use old status checks by overriding esStore to use kbDataClient
          const esStore = new ElasticsearchStore(
            esClient,
            kbDataClient.indexTemplateAndPattern.alias,
            logger,
            telemetry,
            elserId,
            kbResource,
            kbDataClient
          );

          const indexExists = await esStore.indexExists();
          const pipelineExists = await esStore.pipelineExists();
          const modelExists = await esStore.isModelInstalled(elserId);
          const setupAvailable = await kbDataClient.isSetupAvailable();

          const body: ReadKnowledgeBaseResponse = {
            elser_exists: modelExists,
            index_exists: indexExists,
            is_setup_in_progress: kbDataClient.isSetupInProgress,
            is_setup_available: setupAvailable,
            pipeline_exists: pipelineExists,
          };

          if (indexExists && kbResource === ESQL_RESOURCE) {
            const esqlExists =
              (
                await kbDataClient.getKnowledgeBaseDocumentEntries({
                  query: ESQL_DOCS_LOADED_QUERY,
                  // kbResource, // Note: `8.15` installs have kbResource as `unknown`, so don't filter yet
                  required: true,
                })
              ).length > 0;
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
