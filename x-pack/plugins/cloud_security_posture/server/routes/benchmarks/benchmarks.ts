/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';

import { uniq, map } from 'lodash';
import type { IRouter, SavedObjectsClientContract } from 'src/core/server';
import {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../fleet/server';
import { GetAgentPoliciesResponseItem, PackagePolicy, AgentPolicy } from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../lib/csp_app_context_services';

// TODO: check for undefined in the error handling

// const filterAgentPolicyByPackagePolicy = (
//   agentPolicies: AgentPolicy[],
//   packagePolicyIds: string[]
// ) => {
//   agentPolicies.map((agentPolicy: AgentPolicy) => {
//     const mose = agentPolicy.package_policies.filter((packagePolicy: string) =>
//       packagePolicyIds.includes(packagePolicy)
//     );
//   });
// };

const getPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface | undefined,
  packageName: string
): Promise<PackagePolicy[]> => {
  const { items: packagePolicies } = (await packagePolicyService?.list(soClient, {
    kuery: `ingest-package-policies.package.name:${packageName}`,
    perPage: 1000,
    page: 1,
  })) ?? { items: [] as PackagePolicy[] };

  return packagePolicies;
};

const getAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface | undefined
): Promise<AgentPolicy[] | undefined> => {
  const agentPolicyIds = uniq(map(packagePolicies, 'policy_id'));
  const agentPolicies = await agentPolicyService?.getByIds(soClient, agentPolicyIds);

  return agentPolicies;
};

const addRunningAgentToAgentPolicy = async (
  agentPolicies: PackagePolicy[],
  agentService: AgentService | undefined
) => {
  if (agentPolicies?.length) {
    const tmp = agentPolicies.map(async (agentPolicy: AgentPolicy) => {
      const tmp2 = await agentService?.asInternalUser.getAgentStatusForAgentPolicy(agentPolicy.id);
    });
    // await pMap(
    //   agentPolicies,
    //   (agentPolicy: GetAgentPoliciesResponseItem) =>
    //     agentService?.asInternalUser
    //       .getAgentStatusForAgentPolicy(agentPolicy.id)
    //       .then(({ total: agentTotal }) => (agentPolicy.agents = agentTotal)),
    //   { concurrency: 10 }
    // );
  }
};

export const defineGetBenchmarksRoute = (router: IRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const soClient = context.core.savedObjects.client;

        const packagePolicyService = cspContext.service.getPackagePolicyService();
        const agentPolicyService = cspContext.service.getAgentPolicyService();
        const agentService = cspContext.service.getAgentService();

        const packagePolicies = await getPackagePolicies(soClient, packagePolicyService, 'k8s_cis');

        const agentPolicies = await getAgentPolicies(soClient, packagePolicies, agentPolicyService);

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

        const enrichAgentPolicies = agentPolicies?.flatMap((agentPolicy: AgentPolicy) => {
          const packagePolicyDetails = agentPolicy.package_policies.map(
            (packagePolicyId: string | PackagePolicy) => {
              const packageDetails = packagePolicies.filter(
                (packagePolicy) => packagePolicy.id === packagePolicyId
              )[0];
              if (packageDetails) {
                return {
                  package_policy_id: packagePolicyId,
                  package_policy_name: packageDetails?.name,
                  namespace: packageDetails?.namespace,
                  package_name: packageDetails.package?.name,
                  package_title: packageDetails.package?.title,
                  package_version: packageDetails.package?.version,
                  created_by: packageDetails?.created_by,
                  created_at: packageDetails?.created_at,
                  last_update: packageDetails?.updated_at,
                  agent_policy_id: agentPolicy.id,
                  agent_policy_name: agentPolicy.name,
                  agents: agentPolicy.agents,
                };
              }
            }
          );
          if (packagePolicyDetails) {
            return packagePolicyDetails;
          }
        });

        return response.ok({
          body: enrichAgentPolicies,
        });
      } catch (err) {
        // TODO - validate err object and parse
        return response.customError({ body: { message: err.message }, statusCode: 500 });
      }
    }
  );
