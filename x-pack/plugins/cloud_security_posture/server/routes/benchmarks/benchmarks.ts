/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, map } from 'lodash';
import type { SavedObjectsClientContract } from 'src/core/server';
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../fleet/server';
import type {
  GetAgentPoliciesResponseItem,
  PackagePolicy,
  AgentPolicy,
  ListResult,
} from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH, CIS_KUBERNETES_PACKAGE_NAME } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import type { Benchmark } from '../../../common/types';
import { isNonNullable } from '../../../common/utils/helpers';
import { CspRouter } from '../../types';

type BenchmarksQuerySchema = TypeOf<typeof benchmarksInputSchema>;

export const DEFAULT_BENCHMARKS_PER_PAGE = 20;
export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const getPackageNameQuery = (packageName: string, benchmarkFilter?: string): string => {
  const integrationNameQuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`;
  const kquery = benchmarkFilter
    ? `${integrationNameQuery} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *${benchmarkFilter}*`
    : integrationNameQuery;

  return kquery;
};

export const getPackagePolicies = (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface,
  packageName: string,
  queryParams: BenchmarksQuerySchema
): Promise<ListResult<PackagePolicy>> => {
  if (!packagePolicyService) {
    throw new Error('packagePolicyService is undefined');
  }

  return packagePolicyService?.list(soClient, {
    kuery: getPackageNameQuery(packageName, queryParams.benchmark_name),
    page: queryParams.page,
    perPage: queryParams.per_page,
    sortField: queryParams.sort_field,
    sortOrder: queryParams.sort_order,
  });
};

export const getAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface
): Promise<AgentPolicy[]> => {
  const agentPolicyIds = uniq(map(packagePolicies, 'policy_id'));
  const agentPolicies = await agentPolicyService.getByIds(soClient, agentPolicyIds);

  return agentPolicies;
};

const addRunningAgentToAgentPolicy = async (
  agentService: AgentService,
  agentPolicies: AgentPolicy[]
): Promise<GetAgentPoliciesResponseItem[]> => {
  if (!agentPolicies?.length) return [];
  return Promise.all(
    agentPolicies.map((agentPolicy) =>
      agentService.asInternalUser
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
  packagePolicies.flatMap((packagePolicy) => {
    return agentPolicies
      .map((agentPolicy) => {
        const agentPkgPolicies = agentPolicy.package_policies as string[];
        const isExistsOnAgent = agentPkgPolicies.find(
          (pkgPolicy) => pkgPolicy === packagePolicy.id
        );
        if (isExistsOnAgent) {
          return createBenchmarkEntry(agentPolicy, packagePolicy);
        }
        return;
      })
      .filter(isNonNullable);
  });

export const defineGetBenchmarksRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: { query: benchmarksInputSchema },
    },
    async (context, request, response) => {
      if (!context.fleet.authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const soClient = context.core.savedObjects.client;
        const { query } = request;

        const agentService = cspContext.service.agentService;
        const agentPolicyService = cspContext.service.agentPolicyService;
        const packagePolicyService = cspContext.service.packagePolicyService;

        if (!agentPolicyService || !agentService || !packagePolicyService) {
          throw new Error(`Failed to get Fleet services`);
        }

        const packagePolicies = await getPackagePolicies(
          soClient,
          packagePolicyService,
          CIS_KUBERNETES_PACKAGE_NAME,
          query
        );

        const agentPolicies = await getAgentPolicies(
          soClient,
          packagePolicies.items,
          agentPolicyService
        );
        const enrichAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
        const benchmarks = createBenchmarks(enrichAgentPolicies, packagePolicies.items);

        return response.ok({
          body: {
            ...packagePolicies,
            items: benchmarks,
          },
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Failed to fetch benchmarks ${err}`);
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
  /**
   *  Once of PackagePolicy fields for sorting the found objects.
   *  Sortable fields: id, name, policy_id, namespace, updated_at, updated_by, created_at, created_by,
   *  package.name,  package.title, package.version
   */
  sort_field: rt.maybe(
    rt.oneOf(
      [
        rt.literal('id'),
        rt.literal('name'),
        rt.literal('policy_id'),
        rt.literal('namespace'),
        rt.literal('updated_at'),
        rt.literal('updated_by'),
        rt.literal('created_at'),
        rt.literal('created_by'),
        rt.literal('package.name'),
        rt.literal('package.title'),
      ],
      { defaultValue: 'name' }
    )
  ),
  /**
   * The order to sort by
   */
  sort_order: rt.oneOf([rt.literal('asc'), rt.literal('desc')], { defaultValue: 'desc' }),
  /**
   * Benchmark filter
   */
  benchmark_name: rt.maybe(rt.string()),
});
