/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, map } from 'lodash';
import type { IRouter, SavedObjectsClientContract } from 'src/core/server';
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { string } from 'io-ts';
import {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../fleet/server';
import { GetAgentPoliciesResponseItem, PackagePolicy, AgentPolicy } from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH, CIS_VANILLA_PACKAGE_NAME } from '../../../common/constants';
import { CspAppContext } from '../../plugin';

// TODO: use the same method from common/ once PR 106 is merged
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

type BenchmarksQuerySchema = TypeOf<typeof benchmarksInputSchema>;

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

export const DEFAULT_BENCHMARKS_PER_PAGE = 20;
export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const getPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface | undefined,
  packageName: string,
  queryParams: BenchmarksQuerySchema
): Promise<PackagePolicy[]> => {
  if (!packagePolicyService) {
    throw new Error('packagePolicyService is undefined');
  }

  const { items: packagePolicies } = (await packagePolicyService?.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`,
    page: queryParams.page,
    perPage: queryParams.per_page,
  })) ?? { items: [] as PackagePolicy[] };

  return packagePolicies;
};

export const getAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface | undefined
): Promise<AgentPolicy[] | undefined> => {
  if (!agentPolicyService) {
    throw new Error('agentPolicyService is undefined');
  }

  const agentPolicyIds = uniq(map(packagePolicies, 'policy_id'));
  const agentPolicies = await agentPolicyService?.getByIds(soClient, agentPolicyIds);

  return agentPolicies;
};

export const addRunningAgentToAgentPolicy = async (
  agentService: AgentService | undefined,
  agentPolicies: AgentPolicy[] | undefined
): Promise<GetAgentPoliciesResponseItem[]> => {
  if (!agentService) {
    throw new Error('agentService is undefined');
  }

  if (!agentPolicies?.length) return [];
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

export const createBenchmarkEntry = (
  agentPolicy: GetAgentPoliciesResponseItem,
  packagePolicy: PackagePolicy
): Benchmark => ({
  package_policy: {
    id: packagePolicy.id,
    name: packagePolicy.name,
    policy_id: packagePolicy.policy_id,
    namespace: packagePolicy.namespace,
    updated_at: packagePolicy.updated_at,
    updated_by: packagePolicy.updated_by,
    created_at: packagePolicy.created_at,
    created_by: packagePolicy.created_by,
    package: packagePolicy.package
      ? {
          name: packagePolicy.package.name,
          title: packagePolicy.package.title,
          version: packagePolicy.package.version,
        }
      : undefined,
  },
  agent_policy: {
    id: agentPolicy.id,
    name: agentPolicy.name,
    agents: agentPolicy.agents,
  },
});

const createBenchmarks = (
  agentPolicies: GetAgentPoliciesResponseItem[],
  packagePolicies: PackagePolicy[]
): Benchmark[] =>
  agentPolicies
    .flatMap((agentPolicy) =>
      agentPolicy.package_policies.map((agentPackagePolicy) => {
        const id = string.is(agentPackagePolicy) ? agentPackagePolicy : agentPackagePolicy.id;
        const packagePolicy = packagePolicies.find((pkgPolicy) => pkgPolicy.id === id);
        if (!packagePolicy) return;
        return createBenchmarkEntry(agentPolicy, packagePolicy);
      })
    )
    .filter(isNonNullable);

export const defineGetBenchmarksRoute = (router: IRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: { query: benchmarksInputSchema },
    },
    async (context, request, response) => {
      try {
        const soClient = context.core.savedObjects.client;
        const { query } = request;

        const agentService = cspContext.service.getAgentService();
        const agentPolicyService = cspContext.service.getAgentPolicyService();
        const packagePolicyService = cspContext.service.getPackagePolicyService();

        const packagePolicies = await getPackagePolicies(
          soClient,
          packagePolicyService,
          CIS_VANILLA_PACKAGE_NAME,
          query
        );

        const agentPolicies = await getAgentPolicies(soClient, packagePolicies, agentPolicyService);
        const enrichAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
        const benchmarks = createBenchmarks(enrichAgentPolicies, packagePolicies);

        return response.ok({
          body: benchmarks,
        });
      } catch (err) {
        const error = transformError(err);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );

export const benchmarksInputSchema = rt.object({
  /**
   * The page of objects to return
   */
  page: rt.number({ defaultValue: 1, min: 1 }),
  /**
   * The number of objects to include in each page
   */
  per_page: rt.number({ defaultValue: DEFAULT_BENCHMARKS_PER_PAGE, min: 0 }),
});
