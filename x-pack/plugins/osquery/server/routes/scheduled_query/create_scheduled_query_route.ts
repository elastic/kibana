/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const createScheduledQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/scheduled',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const integration = await packagePolicyService?.create(
        savedObjectsClient,
        esClient,
        callCluster,
        // @ts-expect-error update types
        request.body
      );

      return response.ok({
        body: integration,
      });
    }
  );
};
