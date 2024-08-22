/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse, IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  GetCapabilitiesResponse,
  INTERNAL_API_ACCESS,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { CAPABILITIES } from '../../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../../types';

import { buildResponse } from '../../lib/build_response';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';

/**
 * Get the assistant capabilities for the requesting plugin
 *
 * @param router IRouter for registering routes
 */
export const getCapabilitiesRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: INTERNAL_API_ACCESS,
      path: CAPABILITIES,
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
              body: { custom: buildRouteValidationWithZod(GetCapabilitiesResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetCapabilitiesResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;

        try {
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });
          const registeredFeatures = assistantContext.getRegisteredFeatures(pluginName);
          return response.ok({ body: registeredFeatures });
        } catch (err) {
          const error = transformError(err);
          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
