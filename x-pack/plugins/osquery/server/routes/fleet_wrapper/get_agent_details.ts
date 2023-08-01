/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { GetAgentDetailsRequestParamsSchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentDetailsRequestParamsSchema } from '../../../common/api';

export const getAgentDetailsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agents/{id}',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof getAgentDetailsRequestParamsSchema,
              GetAgentDetailsRequestParamsSchema
            >(getAgentDetailsRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        let agent;

        try {
          agent = await osqueryContext.service
            .getAgentService()
            ?.asInternalUser // @ts-expect-error update types
            ?.getAgent(request.params.id);
        } catch (err) {
          return response.notFound();
        }

        return response.ok({ body: { item: agent } });
      }
    );
};
