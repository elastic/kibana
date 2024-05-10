/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  CreateKnowledgeBaseRequestParams,
  CreateKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { KNOWLEDGE_BASE } from '../../../common/constants';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_DOCS_LOADED_QUERY, ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './constants';
import { getKbResource } from './get_kb_resource';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';

/**
 * Load Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const postKnowledgeBaseRoute = (
  router: ElasticAssistantPluginRouter,
  getElser: GetElser
) => {
  router.versioned
    .post({
      access: 'internal',
      path: KNOWLEDGE_BASE,
      options: {
        // Note: Relying on current user privileges to scope an esClient.
        // Add `access:kbnElasticAssistant` to limit API access to only users with assistant privileges
        tags: [],
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
