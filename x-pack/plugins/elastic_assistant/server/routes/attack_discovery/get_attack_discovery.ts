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
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { AttackDiscoveryTask } from '../../services/task_manager/attack_discovery_task';
import { ATTACK_DISCOVERY } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';

export const getAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  attackDiscoveryTask: AttackDiscoveryTask
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
          const statusCheck = await attackDiscoveryTask.statusCheck();
          console.log('steph statusCheck result', statusCheck);
          const staticId = await attackDiscoveryTask.getTaskById(
            'd5b4d04c-cf11-4a1d-8310-cfe61501f91e'
          );
          console.log('steph staticId result', staticId);
          statusCheck.forEach(async ({ id }) => {
            const dynId = await attackDiscoveryTask.getTaskById(id);

            console.log(`steph dynId result ${id}`, dynId);
          });
          return response.ok({
            body: {
              inProgressRequests: statusCheck.map(({ state }) => state.connectorId),
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
