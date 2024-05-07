/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ReadKnowledgeBaseRequestParams,
  ReadKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { KibanaRequest } from '@kbn/core/server';
import { getKbResource } from './get_kb_resource';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { KNOWLEDGE_BASE } from '../../../common/constants';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import { ESQL_DOCS_LOADED_QUERY, ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './constants';

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
            params: buildRouteValidationWithZod(ReadKnowledgeBaseRequestParams),
          },
        },
      },
      async (context, request: KibanaRequest<ReadKnowledgeBaseRequestParams>, response) => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          // Get a scoped esClient for finding the status of the Knowledge Base index, pipeline, and documents
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const elserId = await getElser(request, (await context.core).savedObjects.getClient());
          const kbResource = getKbResource(request);
          const esStore = new ElasticsearchStore(
            esClient,
            KNOWLEDGE_BASE_INDEX_PATTERN,
            logger,
            telemetry,
            elserId,
            kbResource
          );

          const indexExists = await esStore.indexExists();
          const pipelineExists = await esStore.pipelineExists();
          const modelExists = await esStore.isModelInstalled(elserId);

          const body: ReadKnowledgeBaseResponse = {
            elser_exists: modelExists,
            index_exists: indexExists,
            pipeline_exists: pipelineExists,
          };

          if (kbResource === ESQL_RESOURCE) {
            const esqlExists =
              indexExists && (await esStore.similaritySearch(ESQL_DOCS_LOADED_QUERY)).length > 0;
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
