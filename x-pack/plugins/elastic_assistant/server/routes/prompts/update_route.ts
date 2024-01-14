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
import { buildRouteValidationWithZod } from '../route_validation';
import { buildResponse } from '../utils';
import { PromptResponse, PromptUpdateProps } from '../../schemas/prompts/crud_prompts_route.gen';

export const updatePromptRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .put({
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
            body: buildRouteValidationWithZod(PromptUpdateProps),
            params: schema.object({
              promptId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PromptResponse>> => {
        const assistantResponse = buildResponse(response);
        const { promptId } = request.params;

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);

          const dataClient = await ctx.elasticAssistant.getAIAssistantPromptsSOClient();

          const existingPrompt = await dataClient?.getPrompt(promptId);
          if (existingPrompt == null) {
            return assistantResponse.error({
              body: `Prompt id: "${promptId}" not found`,
              statusCode: 404,
            });
          }
          const prompt = await dataClient?.updatePromptItem(existingPrompt, request.body);
          if (prompt == null) {
            return assistantResponse.error({
              body: `prompt id: "${promptId}" was not updated`,
              statusCode: 400,
            });
          }
          return response.ok({
            body: prompt,
          });
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
