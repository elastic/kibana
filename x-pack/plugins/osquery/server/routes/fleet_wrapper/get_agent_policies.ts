/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import bluebird from 'bluebird';
import { schema } from '@kbn/config-schema';
import { GetAgentPoliciesResponseItem, AGENT_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentPoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agent_policies',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const esClient = context.core.elasticsearch.client.asInternalUser;

      // TODO: Use getAgentPoliciesHandler from x-pack/plugins/fleet/server/routes/agent_policy/handlers.ts
      const body = await osqueryContext.service.getAgentPolicyService()?.list(soClient, {
        ...(request.query || {}),
        perPage: 100,
      });

      if (body?.items) {
        await bluebird.map(
          body.items,
          (agentPolicy: GetAgentPoliciesResponseItem) =>
            osqueryContext.service
              .getAgentService()
              ?.listAgents(esClient, {
                showInactive: false,
                perPage: 0,
                page: 1,
                kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:${agentPolicy.id}`,
              })
              .then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
          { concurrency: 10 }
        );
      }

      return response.ok({ body });
    }
  );
};
