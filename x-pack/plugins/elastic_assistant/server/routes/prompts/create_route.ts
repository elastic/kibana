/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_PROMPTS_URL,
} from '@kbn/elastic-assistant-common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { buildRouteValidationWithZod } from '../route_validation';
import { PromptCreateProps, PromptResponse } from '../../schemas/prompts/crud_prompts_route.gen';

export const createPromptRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_PROMPTS_URL,

      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PromptCreateProps),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PromptResponse>> => {
        const assistantResponse = buildResponse(response);
        // const validationErrors = validateCreateRuleProps(request.body);
        // if (validationErrors.length) {
        //  return siemResponse.error({ statusCode: 400, body: validationErrors });
        // }

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);

          const dataClient = await ctx.elasticAssistant.getAIAssistantPromptsSOClient();
          const createdPrompt = await dataClient.createPrompt(request.body);
          return response.ok({
            body: PromptResponse.parse(createdPrompt),
          });
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
