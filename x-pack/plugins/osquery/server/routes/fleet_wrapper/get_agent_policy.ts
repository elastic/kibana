/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getInternalSavedObjectsClient } from '../utils';

export const getAgentPolicyRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agent_policies/{id}',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
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
