/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { BuildIntegrationRequestBody, INTEGRATION_BUILDER_PATH } from '../../common';
import { buildPackage } from '../integration_builder';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';

export function registerIntegrationBuilderRoutes(
  router: IRouter<IntegrationAssistantRouteHandlerContext>
) {
  router.versioned
    .post({
      path: INTEGRATION_BUILDER_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(BuildIntegrationRequestBody),
          },
        },
      },
      async (_, request, response) => {
        const { integration } = request.body;
        try {
          const zippedIntegration = await buildPackage(integration);
          return response.custom({
            statusCode: 200,
            body: zippedIntegration,
            headers: { 'Content-Type': 'application/zip' },
          });
        } catch (e) {
          return response.customError({ statusCode: 500, body: e });
        }
      }
    );
}
