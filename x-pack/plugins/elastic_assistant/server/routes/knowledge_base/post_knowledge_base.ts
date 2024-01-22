/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../../types';
import { KNOWLEDGE_BASE } from '../../../common/constants';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_DOCS_LOADED_QUERY, ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './constants';
import { getKbResource } from './get_kb_resource';
import { PostKnowledgeBasePathParams } from '../../schemas/knowledge_base/post_knowledge_base';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';

/**
 * Load Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const postKnowledgeBaseRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.post(
    {
      path: KNOWLEDGE_BASE,
      validate: {
        params: buildRouteValidation(PostKnowledgeBasePathParams),
      },
      options: {
        // Note: Relying on current user privileges to scope an esClient.
        // Add `access:kbnElasticAssistant` to limit API access to only users with assistant privileges
        tags: [],
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);
      const assistantContext = await context.elasticAssistant;
      const logger = assistantContext.logger;
      const telemetry = assistantContext.telemetry;

      try {
        const core = await context.core;
        // Get a scoped esClient for creating the Knowledge Base index, pipeline, and documents
        const esClient = core.elasticsearch.client.asCurrentUser;
        const elserId = await getElser(request, core.savedObjects.getClient());
        const kbResource = getKbResource(request);
        const esStore = new ElasticsearchStore(
          esClient,
          KNOWLEDGE_BASE_INDEX_PATTERN,
          logger,
          telemetry,
          elserId,
          kbResource
        );

        // Pre-check on index/pipeline
        let indexExists = await esStore.indexExists();
        let pipelineExists = await esStore.pipelineExists();

        // Load if not exists
        if (!pipelineExists) {
          pipelineExists = await esStore.createPipeline();
        }
        if (!indexExists) {
          indexExists = await esStore.createIndex();
        }

        // If specific resource is requested, load it
        if (kbResource === ESQL_RESOURCE) {
          const esqlExists = (await esStore.similaritySearch(ESQL_DOCS_LOADED_QUERY)).length > 0;
          if (!esqlExists) {
            const loadedKnowledgeBase = await loadESQL(esStore, logger);
            return response.custom({ body: { success: loadedKnowledgeBase }, statusCode: 201 });
          } else {
            return response.ok({ body: { success: true } });
          }
        }

        const wasSuccessful = indexExists && pipelineExists;

        if (wasSuccessful) {
          return response.ok({ body: { success: true } });
        } else {
          return response.custom({ body: { success: false }, statusCode: 500 });
        }
      } catch (err) {
        logger.log(err);
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
