/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { find } from 'lodash';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';

export const getOsqueryAvailable = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/fleet_wrapper/agents/{id}/available',
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

      const soClient = context.core.savedObjects.client;

      const packageInfo = await osqueryContext.service
        .getAgentPolicyService()
        ?.get(soClient, agent?.policy_id as string);

      const osqueryPackageInstalled = find(packageInfo?.package_policies, [
        'package.name',
        OSQUERY_INTEGRATION_NAME,
      ]) as { enabled: boolean };
      return response.ok({ body: { item: osqueryPackageInstalled?.enabled } });
    }
  );
};
