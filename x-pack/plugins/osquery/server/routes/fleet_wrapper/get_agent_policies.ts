/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { filter, uniq, flatMap } from 'lodash';
import { satisfies } from 'semver';
import type { GetAgentPoliciesResponseItem, PackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import type {
  GetAgentPoliciesRequestParamsSchema,
  GetAgentPoliciesRequestQuerySchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getInternalSavedObjectsClient } from '../utils';
import {
  getAgentPoliciesRequestParamsSchema,
  getAgentPoliciesRequestQuerySchema,
} from '../../../common/api';

export const getAgentPoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agent_policies',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof getAgentPoliciesRequestParamsSchema,
              GetAgentPoliciesRequestParamsSchema
            >(getAgentPoliciesRequestParamsSchema),
            query: buildRouteValidation<
              typeof getAgentPoliciesRequestQuerySchema,
              GetAgentPoliciesRequestQuerySchema
            >(getAgentPoliciesRequestQuerySchema),
          },
        },
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
        const agentPolicyIds = uniq(flatMap(supportedPackagePolicyIds, 'policy_ids'));
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
