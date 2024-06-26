/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryGetResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  AttackDiscoveryGetRequestParams,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { ATTACK_DISCOVERY_BY_CONNECTOR_ID } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';

export const getAttackDiscoveryRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY_BY_CONNECTOR_ID,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(AttackDiscoveryGetRequestParams),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(AttackDiscoveryGetResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AttackDiscoveryGetResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        try {
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          const authenticatedUser = assistantContext.getCurrentUser();
          const connectorId = decodeURIComponent(request.params.connectorId);
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
          const attackDiscovery = await dataClient.findAttackDiscoveryByConnectorId({
            connectorId,
            authenticatedUser,
          });

          return response.ok({
            body:
              attackDiscovery != null
                ? {
                    data: attackDiscovery,
                    entryExists: true,
                  }
                : {
                    entryExists: false,
                  },
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
