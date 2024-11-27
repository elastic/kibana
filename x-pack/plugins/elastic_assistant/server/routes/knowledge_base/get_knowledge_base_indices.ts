/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
  GetKnowledgeBaseIndicesResponse,
} from '@kbn/elastic-assistant-common';
import { IKibanaResponse } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';

/**
 * Get the indices that have fields of `semantic_text` type
 *
 * @param router IRouter for registering routes
 */
export const getKnowledgeBaseIndicesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: false,
      },
      async (context, _, response): Promise<IKibanaResponse<GetKnowledgeBaseIndicesResponse>> => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const logger = ctx.elasticAssistant.logger;
        const esClient = ctx.core.elasticsearch.client.asCurrentUser;

        try {
          const body: GetKnowledgeBaseIndicesResponse = {
            indices: [],
          };

          const res = await esClient.fieldCaps({
            index: '*',
            fields: '*',
            types: ['semantic_text'],
            include_unmapped: true,
          });

          body.indices = Object.values(res.fields)
            .flatMap((value) => value.semantic_text?.indices ?? [])
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();

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
