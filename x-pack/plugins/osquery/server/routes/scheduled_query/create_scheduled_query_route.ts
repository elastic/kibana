/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';

import {
  createSavedQueryRequestSchema,
  CreateSavedQueryRequestSchemaDecoded,
} from '../../../common/schemas/routes/saved_query/create_saved_query_request_schema';
import { savedQuerySavedObjectType } from '../../../common/types';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';

export const createScheduledQueryRoute = (router: IRouter, osqueryContext) => {
  router.post(
    {
      path: '/internal/osquery/scheduled',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      console.log(context);
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const integration = await packagePolicyService.create(
        savedObjectsClient,
        esClient,
        callCluster,
        request.body
      );

      return response.ok({
        body: integration,
      });
    }
  );
};
