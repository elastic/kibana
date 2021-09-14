/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const readScheduledQueryGroupRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext
) => {
  router.get(
    {
      path: '/internal/osquery/scheduled_query_group/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const scheduledQueryGroup = await packagePolicyService?.get(
        savedObjectsClient,
        // @ts-expect-error update types
        request.params.id
      );

      return response.ok({
        body: { item: scheduledQueryGroup },
      });
    }
  );
};
