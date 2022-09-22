/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { createLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createActionHandler } from '../../handlers';

export const createLiveQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/api/osquery/live_queries',
      validate: {
        body: buildRouteValidation<
          typeof createLiveQueryRequestBodySchema,
          CreateLiveQueryRequestBodySchema
        >(createLiveQueryRequestBodySchema),
      },
    },
    async (context, request, response) => {
      const [coreStartServices] = await osqueryContext.getStartServices();

      const {
        osquery: { writeLiveQueries, runSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      const isInvalid = !(
        writeLiveQueries ||
        (runSavedQueries && (request.body.saved_query_id || request.body.pack_id))
      );

      if (isInvalid) {
        return response.forbidden();
      }

      try {
        const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;
        const { response: osqueryAction } = await createActionHandler(
          osqueryContext,
          request.body,
          { currentUser }
        );

        return response.ok({
          body: { data: osqueryAction },
        });
      } catch (error) {
        // TODO validate for 400 (when agents are not found for selection)
        // return response.badRequest({ body: new Error('No agents found for selection') });

        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
