/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { INTEGRATION_BUILDER_PATH } from '../../common';
import { buildPackage } from '../integration_builder';
import type { BuildIntegrationApiRequest } from '../../common';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';

export function registerIntegrationBuilderRoutes(
  router: IRouter<IntegrationAssistantRouteHandlerContext>
) {
  router.post(
    {
      path: `${INTEGRATION_BUILDER_PATH}`,
      validate: {
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
    async (_, req, res) => {
      const { integration } = req.body as BuildIntegrationApiRequest;
      try {
        const zippedIntegration = await buildPackage(integration);
        return res.custom({ statusCode: 200, body: zippedIntegration });
      } catch (e) {
        return res.customError({ statusCode: 500, body: e });
      }
    }
  );
}
