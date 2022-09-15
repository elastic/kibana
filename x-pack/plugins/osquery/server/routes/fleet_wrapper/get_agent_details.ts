/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentDetailsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agents/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      let agent;
      // this is to skip validation eg. for analysts in cases attachments so they can see the results despite not having permissions
      const { isSystemRequest } = request;
      if (!isSystemRequest) {
        const [coreStartServices] = await osqueryContext.getStartServices();
        const { osquery } = await coreStartServices.capabilities.resolveCapabilities(request);
        const isInvalid = !osquery.read;

        if (isInvalid) {
          return response.forbidden();
        }
      }

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
