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
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_RESOURCE } from './constants';
import { getKbResource } from './get_kb_resource';

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
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          const kbResource = getKbResource(request);
          const esClient = (await context.core).elasticsearch.client.asInternalUser;

          const knowledgeBaseDataClient =
            await assistantContext.getAIAssistantKnowledgeBaseDataClient();
          if (!knowledgeBaseDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }
          const esStore = new ElasticsearchStore(
            esClient,
            knowledgeBaseDataClient.indexTemplateAndPattern.alias,
            logger,
            telemetry,
            'elserId', // Not needed for delete ops
            kbResource,
            knowledgeBaseDataClient
          );

          if (kbResource === ESQL_RESOURCE) {
            // For now, tearing down the Knowledge Base is fine, but will want to support removing specific assets based
            // on resource name or document query
            // Implement deleteDocuments(query: string) in ElasticsearchStore
            // const success = await esStore.deleteDocuments();
            // return const body: DeleteKnowledgeBaseResponse = { success };
          }

          // Delete index and pipeline
          const indexDeleted = await esStore.deleteIndex();
          const pipelineDeleted = await esStore.deletePipeline();

          const body: DeleteKnowledgeBaseResponse = {
            success: indexDeleted && pipelineDeleted,
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
