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

export const getAgentsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agents',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const agents = await osqueryContext.service
        .getAgentService()
        // @ts-expect-error update types
        ?.listAgents(esClient, request.query);

      return response.ok({ body: agents });
    }
  );
};
