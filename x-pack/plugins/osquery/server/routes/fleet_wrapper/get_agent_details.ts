/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { PLUGIN_ID } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentDetailsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agents/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
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
