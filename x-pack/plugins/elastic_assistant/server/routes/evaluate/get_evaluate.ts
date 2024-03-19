/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  GetEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { EVALUATE } from '../../../common/constants';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { AGENT_EXECUTOR_MAP } from '../../lib/langchain/executors';

export const getEvaluateRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: INTERNAL_API_ACCESS,
      path: EVALUATE,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          response: {
            200: {
              body: buildRouteValidationWithZod(GetEvaluateResponse),
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetEvaluateResponse>> => {
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;

        // Validate evaluation feature is enabled
        const pluginName = getPluginNameFromRequest({
          request,
          defaultPluginName: DEFAULT_PLUGIN_NAME,
          logger,
        });
        const registeredFeatures = assistantContext.getRegisteredFeatures(pluginName);
        if (!registeredFeatures.assistantModelEvaluation) {
          return response.notFound();
        }

        try {
          return response.ok({ body: { agentExecutors: Object.keys(AGENT_EXECUTOR_MAP) } });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          const resp = buildResponse(response);
          return resp.error({
            body: { error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
