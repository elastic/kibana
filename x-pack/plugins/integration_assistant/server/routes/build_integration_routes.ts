/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { BuildIntegrationApiRequest } from '../../common';
import { INTEGRATION_BUILDER_PATH } from '../../common';
import { buildPackage } from '../integration_builder';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';

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
            body: schema.object({
              integration: schema.object({
                name: schema.string(),
                title: schema.string(),
                description: schema.string(),
                logo: schema.maybe(schema.string()),
                dataStreams: schema.arrayOf(
                  schema.object({
                    name: schema.string(),
                    title: schema.string(),
                    description: schema.string(),
                    inputTypes: schema.arrayOf(schema.string()),
                    rawSamples: schema.arrayOf(schema.string()),
                    pipeline: schema.object({
                      name: schema.maybe(schema.string()),
                      description: schema.maybe(schema.string()),
                      version: schema.maybe(schema.number()),
                      processors: schema.arrayOf(
                        schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }))
                      ),
                      on_failure: schema.maybe(
                        schema.arrayOf(
                          schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }))
                        )
                      ),
                    }),
                    docs: schema.arrayOf(schema.object({}, { unknowns: 'allow' })),
                  })
                ),
              }),
            }),
          },
        },
      },
      async (_, request, response) => {
        const { integration } = request.body as BuildIntegrationApiRequest;
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
