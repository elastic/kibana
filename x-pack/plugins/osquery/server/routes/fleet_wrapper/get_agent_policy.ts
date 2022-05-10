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
import { getInternalSavedObjectsClient } from '../../usage/collector';

export const getAgentPolicyRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agent_policies/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const packageInfo = await osqueryContext.service
        .getAgentPolicyService()
        ?.get(internalSavedObjectsClient, request.params.id);

      return response.ok({ body: { item: packageInfo } });
    }
  );
};
