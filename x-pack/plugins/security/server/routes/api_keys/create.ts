/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { ApiKey } from '../../../common/model';
import { wrapError, wrapIntoCustomErrorResponse } from '../../errors';
import { RouteDefinitionParams } from '..';

interface ResponseType {
  itemsInvalidated: Array<Pick<ApiKey, 'id' | 'name'>>;
  errors: Array<Pick<ApiKey, 'id' | 'name'> & { error: Error }>;
}

export function defineCreateApiKeyRoutes({ router, clusterClient }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key',
      validate: {
        body: schema.object({
          name: schema.string(),
          expiration: schema.maybe(schema.string()),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const scopedClusterClient = clusterClient.asScoped(request);
      try {
        const apiKey = await scopedClusterClient.callAsCurrentUser('shield.createAPIKey', {
          body: request.body,
        });

        return response.ok({ body: apiKey });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
