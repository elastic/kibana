/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';
import { GetAgentStatusResponse } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentStatusForAgentPolicyRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext
) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agent_status',
      validate: {
        query: schema.object({
          policyId: schema.string(),
          kuery: schema.maybe(schema.string()),
        }),
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const results = await osqueryContext.service
        .getAgentService()
        ?.asScoped(request)
        .getAgentStatusForAgentPolicy(request.query.policyId, request.query.kuery);

      if (!results) {
        return response.ok({ body: {} });
      }

      const body: GetAgentStatusResponse = { results };

      return response.ok({ body });
    }
  );
};
