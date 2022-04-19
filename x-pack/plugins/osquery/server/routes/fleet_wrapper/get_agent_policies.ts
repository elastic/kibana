/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { schema } from '@kbn/config-schema';
import { filter, uniq, map } from 'lodash';
import { satisfies } from 'semver';
import {
  GetAgentPoliciesResponseItem,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { IRouter } from '@kbn/core/server';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getInternalSavedObjectsClient } from '../../usage/collector';

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
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const agentService = osqueryContext.service.getAgentService();
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const { items: packagePolicies } = (await packagePolicyService?.list(
        internalSavedObjectsClient,
        {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        }
      )) ?? { items: [] as PackagePolicy[] };
      const supportedPackagePolicyIds = filter(packagePolicies, (packagePolicy) =>
        satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
      );
      const agentPolicyIds = uniq(map(supportedPackagePolicyIds, 'policy_id'));
      const agentPolicies = await agentPolicyService?.getByIds(
        internalSavedObjectsClient,
        agentPolicyIds
      );

      if (agentPolicies?.length) {
        await pMap(
          agentPolicies,
          (agentPolicy: GetAgentPoliciesResponseItem) =>
            agentService?.asInternalUser
              .getAgentStatusForAgentPolicy(agentPolicy.id)
              .then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
          { concurrency: 10 }
        );
      }

      return response.ok({ body: agentPolicies });
    }
  );
};
