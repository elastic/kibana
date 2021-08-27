/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';
import { PLUGIN_ID } from '../../../common';
import {
  createSavedQueryRequestSchema,
  CreateSavedQueryRequestSchemaDecoded,
} from '../../../common/schemas/routes/saved_query/create_saved_query_request_schema';
import { savedQuerySavedObjectType } from '../../../common/types';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';

export const createSavedQueryRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/osquery/saved_query',
      validate: {
        body: buildRouteValidation<
          typeof createSavedQueryRequestSchema,
          CreateSavedQueryRequestSchemaDecoded
        >(createSavedQueryRequestSchema),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const { id, description, platform, query, version, interval } = request.body;

      const savedQuerySO = await savedObjectsClient.create(savedQuerySavedObjectType, {
        id,
        description,
        query,
        platform,
        version,
        interval,
      });

      return response.ok({
        body: savedQuerySO,
      });
    }
  );
};
