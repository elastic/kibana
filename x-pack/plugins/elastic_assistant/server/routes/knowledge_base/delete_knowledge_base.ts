/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { DeleteKnowledgeBaseResponse } from '@kbn/elastic-assistant';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { KNOWLEDGE_BASE } from '../../../common/constants';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './constants';
import { DeleteKnowledgeBasePathParams } from '../../schemas/knowledge_base/delete_knowledge_base';

/**
 * Delete Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const deleteKnowledgeBaseRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.delete(
    {
      path: KNOWLEDGE_BASE,
      validate: {
        params: buildRouteValidation(DeleteKnowledgeBasePathParams),
      },
      options: {
        // Note: Relying on current user privileges to scope an esClient.
        // Add `access:kbnElasticAssistant` to limit API access to only users with assistant privileges
        tags: [],
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);
      const logger = (await context.elasticAssistant).logger;

      try {
        const kbResource =
          request.params.resource != null ? decodeURIComponent(request.params.resource) : undefined;

        // Get a scoped esClient for deleting the Knowledge Base index, pipeline, and documents
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const esStore = new ElasticsearchStore(esClient, KNOWLEDGE_BASE_INDEX_PATTERN, logger);

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
