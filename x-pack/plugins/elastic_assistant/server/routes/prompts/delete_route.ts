/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import {
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_PROMPTS_URL_BY_ID,
} from '@kbn/elastic-assistant-common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';

export const deletePromptRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .delete({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_PROMPTS_URL_BY_ID,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            params: schema.object({
              promptId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const assistantResponse = buildResponse(response);
        /* const validationErrors = validateQueryRuleByIds(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }*/

        try {
          const { promptId } = request.params;

          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantPromptsSOClient();

          const existingPrompt = await dataClient?.getPrompt(promptId);
          if (existingPrompt == null) {
            return assistantResponse.error({
              body: `prompt id: "${promptId}" not found`,
              statusCode: 404,
            });
          }
          await dataClient?.deletePromptById(promptId);

          return response.ok({ body: {} });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
