/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const findScheduledQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/scheduled_query',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const kuery = 'ingest-package-policies.attributes.package.name: osquery_elastic_managed';
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const policies = await packagePolicyService.list(context.core.savedObjects.client, { kuery });

      return response.ok({
        body: policies,
      });
    }
  );
};
