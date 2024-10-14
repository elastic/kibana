/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { StartDeps } from './types';
import { wrapError } from './utils/error_wrapper';
import type { TestGrokPatternResponse } from '../common/types/test_grok_pattern';

/**
 * @apiGroup DataVisualizer
 *
 * @api {post} /internal/data_visualizer/test_grok_pattern Tests a grok pattern against a sample of text
 * @apiName testGrokPattern
 * @apiDescription Tests a grok pattern against a sample of text and return the positions of the fields
 */
export function routes(coreSetup: CoreSetup<StartDeps, unknown>, logger: Logger) {
  const router = coreSetup.http.createRouter();

  router.versioned
    .post({
      path: '/internal/data_visualizer/test_grok_pattern',
      access: 'internal',
      options: {
        tags: ['access:fileUpload:analyzeFile'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              grokPattern: schema.string(),
              text: schema.arrayOf(schema.string()),
              ecsCompatibility: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const body = await esClient.asInternalUser.transport.request<TestGrokPatternResponse>({
            method: 'GET',
            path: `/_text_structure/test_grok_pattern`,
            body: {
              grok_pattern: request.body.grokPattern,
              text: request.body.text,
            },
            ...(request.body.ecsCompatibility
              ? {
                  querystring: { ecs_compatibility: request.body.ecsCompatibility },
                }
              : {}),
          });

          return response.ok({ body });
        } catch (e) {
          logger.warn(`Unable to test grok pattern ${e.message}`);
          return response.customError(wrapError(e));
        }
      }
    );

  router.versioned
    .get({
      path: '/internal/data_visualizer/inference_services',
      access: 'internal',
      options: {
        tags: ['access:fileUpload:analyzeFile'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client;
          const { endpoints } = await esClient.asCurrentUser.inference.get({
            inference_id: '_all',
          });

          return response.ok({ body: endpoints });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );
}
