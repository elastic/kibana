/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, map } from 'lodash';
import type { IRouter, SavedObjectsClientContract } from 'src/core/server';
import {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../fleet/server';
import { GetAgentPoliciesResponseItem, PackagePolicy, AgentPolicy } from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH, CIS_VANILLA_PACKAGE_NAME } from '../../../common/constants';
import { CspAppContext } from '../../lib/csp_app_context_services';

export interface Benchmark {
  package_policy: Pick<
    PackagePolicy,
    | 'id'
    | 'name'
    | 'policy_id'
    | 'namespace'
    | 'package'
    | 'updated_at'
    | 'updated_by'
    | 'created_at'
    | 'created_by'
  >;
  agent_policy: Pick<GetAgentPoliciesResponseItem, 'id' | 'name' | 'agents'>;
}

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
  agentPolicies: AgentPolicy[] | undefined,
  agentService: AgentService | undefined
): Promise<GetAgentPoliciesResponseItem[]> => {
  if (!agentPolicies?.length || !agentService) return [];
  return Promise.all(
    agentPolicies.map((agentPolicy) =>
      agentService?.asInternalUser
        .getAgentStatusForAgentPolicy(agentPolicy.id)
        .then((agentStatus) => ({
          ...agentPolicy,
          agents: agentStatus.total,
        }))
    )
  );
};

const createBenchmarks = (
  agentPolicies: GetAgentPoliciesResponseItem[] | undefined,
  packagePolicies: PackagePolicy[]
): Benchmark[] => {
  const benchmarks: Benchmark[] = agentPolicies?.flatMap(
    (agentPolicy: GetAgentPoliciesResponseItem) => {
      const benchmark: Benchmark = agentPolicy.package_policies.map(
        (packagePolicyId: string | PackagePolicy) => {
          const packageDetails = packagePolicies.filter(
            (packagePolicy) => packagePolicy.id === packagePolicyId
          )[0];
          if (packageDetails) {
            return {
              package_policy: {
                id: packagePolicyId,
                name: packageDetails?.name,
                policy_id: packageDetails?.policy_id,
                namespace: packageDetails?.namespace,
                updated_at: packageDetails?.updated_at,
                updated_by: packageDetails?.updated_by,
                created_at: packageDetails?.created_at,
                created_by: packageDetails?.created_by,
                package: {
                  name: packageDetails.package?.name,
                  title: packageDetails.package?.title,
                  version: packageDetails.package?.version,
                },
              },
              agent_policy: {
                id: agentPolicy.id,
                name: agentPolicy.name,
                agents: agentPolicy.agents,
              },
            };
          }
        }
      );
      if (benchmark) {
        return benchmark;
      }
    }
  );
  return benchmarks;
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

        const packagePolicies = await getPackagePolicies(
          soClient,
          packagePolicyService,
          CIS_VANILLA_PACKAGE_NAME
        );

        const agentPolicies = await getAgentPolicies(soClient, packagePolicies, agentPolicyService);
        const agentPolicies2 = await addRunningAgentToAgentPolicy(agentPolicies, agentService);
        const benchmarks = createBenchmarks(agentPolicies2, packagePolicies);

        return response.ok({
          body: benchmarks,
        });
      } catch (err) {
        // TODO - validate err object and parse
        return response.customError({ body: { message: err.message }, statusCode: 500 });
      }
    }
  );
