/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const createStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/status',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const soClient = context.core.savedObjects.client;

      const packageInfo = await osqueryContext.service
        .getPackageService()
        ?.getInstallation({ savedObjectsClient: soClient, pkgName: OSQUERY_INTEGRATION_NAME });

      if (request.query?.agentId) {
        const agentService = osqueryContext.service.getAgentService();
        const agent = await agentService?.getAgent(esClient, request.query.agentId);
        // const agentPolicyService = osqueryContext.service.getAgentPolicyService();
        // const agentPolicy = await agentPolicyService?.getFullAgentPolicy(
        //   soClient,
        //   request.query?.agentPolicyId
        // );

        return response.ok({ body: agent });
      }

      return response.ok({ body: packageInfo });
    }
  );
};
