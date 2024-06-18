/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { z } from 'zod';
import { getAttackDiscoveryStats } from './helpers';
import { ATTACK_DISCOVERY } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';

export const getAllAttackDiscoveriesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(z.object({})) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        try {
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }
          const attackDiscovery = await getAttackDiscoveryStats({
            dataClient,
            authenticatedUser,
          });
          return response.ok({
            body: {},
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
