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
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_DOCS_LOADED_QUERY, ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './constants';
import { getKbResource } from './get_kb_resource';
import { loadESQL } from '../../lib/langchain/content_loaders/esql_loader';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';

// Since we're awaiting on ELSER setup, this could take a bit (especially if ML needs to autoscale)
// Consider just returning if attempt was successful, and switch to client polling
const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

/**
 * Load Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 * @param getElser
 */
export const postKnowledgeBaseRoute = (
  router: ElasticAssistantPluginRouter,
  getElser: GetElser
) => {
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
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;
        const elserId = await getElser();
        const core = await context.core;
        const esClient = core.elasticsearch.client.asInternalUser;
        const soClient = core.savedObjects.getClient();

        const pluginName = getPluginNameFromRequest({
          request,
          defaultPluginName: DEFAULT_PLUGIN_NAME,
          logger,
        });
        const enableKnowledgeBaseByDefault =
          assistantContext.getRegisteredFeatures(pluginName).assistantKnowledgeBaseByDefault;

        try {
          // Code path for when `assistantKnowledgeBaseByDefault` FF is enabled
          if (enableKnowledgeBaseByDefault) {
            const knowledgeBaseDataClient =
              await assistantContext.getAIAssistantKnowledgeBaseDataClient(true);
            if (!knowledgeBaseDataClient) {
              return response.custom({ body: { success: false }, statusCode: 500 });
            }

            // Continue to use esStore for loading esql docs until `semantic_text` is available and we can test the new chunking strategy
            const esStore = new ElasticsearchStore(
              esClient,
              knowledgeBaseDataClient.indexTemplateAndPattern.alias,
              logger,
              telemetry,
              elserId,
              getKbResource(request),
              knowledgeBaseDataClient
            );

            await knowledgeBaseDataClient.setupKnowledgeBase({ esStore, soClient });

            return response.ok({ body: { success: true } });
          }

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
