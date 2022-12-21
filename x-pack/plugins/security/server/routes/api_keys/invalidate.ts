/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { ApiKey } from '../../../common/model';
import { wrapError, wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

interface ResponseType {
  itemsInvalidated: Array<Pick<ApiKey, 'id' | 'name'>>;
  errors: Array<Pick<ApiKey, 'id' | 'name'> & { error: Error }>;
}

export function defineInvalidateApiKeysRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/invalidate',
      validate: {
        body: schema.object({
          apiKeys: schema.arrayOf(schema.object({ id: schema.string(), name: schema.string() })),
          isAdmin: schema.boolean(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        // Invalidate all API keys in parallel.
        const invalidationResult = (
          await Promise.all(
            request.body.apiKeys.map(async (key) => {
              try {
                const esClient = (await context.core).elasticsearch.client;
                const body: { ids: string[]; owner?: boolean } = { ids: [key.id] };
                if (!request.body.isAdmin) {
                  body.owner = true;
                }

                // Send the request to invalidate the API key and return an error if it could not be deleted.
                await esClient.asCurrentUser.security.invalidateApiKey({
                  body,
                });
                return { key, error: undefined };
              } catch (error) {
                return { key, error: wrapError(error) };
              }
            })
          )
        ).reduce(
          (responseBody, { key, error }) => {
            if (error) {
              responseBody.errors.push({ ...key, error });
            } else {
              responseBody.itemsInvalidated.push(key);
            }
            return responseBody;
          },
          { itemsInvalidated: [], errors: [] } as ResponseType
        );

        return response.ok({ body: invalidationResult });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
