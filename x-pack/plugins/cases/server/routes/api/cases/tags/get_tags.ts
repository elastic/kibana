/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/schema';
import { type VersionedRouter } from '@kbn/core-http-server';
import type { CasesRequestHandlerContext } from '../../../../types';
import type { AllTagsFindRequest } from '../../../../../common/api';
import { CASE_TAGS_URL, PUBLIC_VERSION_2023_05_02 } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';

export function registerGetTagsRoute(router: VersionedRouter<CasesRequestHandlerContext>) {
  router
    .get({
      path: CASE_TAGS_URL,
      access: 'public',
      description: 'Get all case tags',
    })
    .addVersion(
      {
        version: PUBLIC_VERSION_2023_05_02,
        validate: {
          request: {
            query: schema.object({
              owner: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
            }),
          },
          response: {
            200: {
              body: schema.arrayOf(schema.string()),
            },
          },
        },
      },
      async (context, request, response) => {
        try {
          const caseContext = await context.cases;
          const client = await caseContext.getCasesClient();
          const options = request.query as AllTagsFindRequest;

          return response.ok({ body: await client.cases.getTags({ ...options }) });
        } catch (error) {
          throw createCaseError({
            message: `Failed to retrieve tags in route: ${error}`,
            error,
          });
        }
      }
    );
}
