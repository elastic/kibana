/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAgentStatusResponse } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import type {
  GetAgentStatusForAgentPolicyRequestParamsSchema,
  GetAgentStatusForAgentPolicyRequestQuerySchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  getAgentStatusForAgentPolicyRequestParamsSchema,
  getAgentStatusForAgentPolicyRequestQuerySchema,
} from '../../../common/api';

export const getAgentStatusForAgentPolicyRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agent_status',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof getAgentStatusForAgentPolicyRequestParamsSchema,
              GetAgentStatusForAgentPolicyRequestParamsSchema
            >(getAgentStatusForAgentPolicyRequestParamsSchema),
            query: buildRouteValidation<
              typeof getAgentStatusForAgentPolicyRequestQuerySchema,
              GetAgentStatusForAgentPolicyRequestQuerySchema
            >(getAgentStatusForAgentPolicyRequestQuerySchema),
          },
        },
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
