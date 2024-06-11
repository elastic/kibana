/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  Metadata,
} from '@kbn/elastic-assistant-common/impl/schemas/knowledge_base/common_attributes.gen';
import type { Document } from 'langchain/document';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import { performChecks } from '../../helpers';

export const createKnowledgeBaseEntryRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,

      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(KnowledgeBaseEntryCreateProps),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<KnowledgeBaseEntryResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger = ctx.elasticAssistant.logger;

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            authenticatedUser: true,
            capability: 'assistantKnowledgeBaseByDefault',
            context: ctx,
            license: true,
            request,
            response,
          });
          if (checkResponse) {
            return checkResponse;
          }

          logger.debug(`Creating KB Entry:\n${JSON.stringify(request.body)}`);
          const documents: Array<Document<Metadata>> = [
            {
              metadata: request.body.metadata,
              pageContent: request.body.text,
            },
          ];
          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient(
            false
          );
          const createResponse = await kbDataClient?.addKnowledgeBaseDocuments({ documents });

          if (createResponse == null) {
            return assistantResponse.error({
              body: `Knowledge Base Entry was not created`,
              statusCode: 400,
            });
          }
          return response.ok({ body: KnowledgeBaseEntryResponse.parse(createResponse[0]) });
        } catch (err) {
          const error = transformError(err as Error);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
