/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, map } from 'lodash';
import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '@kbn/fleet-plugin/server';
import type {
  GetAgentPoliciesResponseItem,
  PackagePolicy,
  AgentPolicy,
  ListResult,
} from '@kbn/fleet-plugin/common';
import {
  BENCHMARKS_ROUTE_PATH,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CSP_RULE_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import {
  BENCHMARK_PACKAGE_POLICY_PREFIX,
  benchmarksInputSchema,
  BenchmarksQuerySchema,
} from '../../../common/schemas/benchmark';
import { CspAppContext } from '../../plugin';
import type { Benchmark, CspRulesStatus } from '../../../common/types';
import type { CspRuleType } from '../../../common/schemas';
import {
  createCspRuleSearchFilterByPackagePolicy,
  isNonNullable,
} from '../../../common/utils/helpers';
import { CspRouter } from '../../types';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const getPackageNameQuery = (packageName: string, benchmarkFilter?: string): string => {
  const integrationNameQuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`;
  const kquery = benchmarkFilter
    ? `${integrationNameQuery} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *${benchmarkFilter}*`
    : integrationNameQuery;

  return kquery;
};

export const getCspPackagePolicies = (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface,
  packageName: string,
  queryParams: Partial<BenchmarksQuerySchema>
): Promise<ListResult<PackagePolicy>> => {
  if (!packagePolicyService) {
    throw new Error('packagePolicyService is undefined');
  }

  const sortField = queryParams.sort_field?.startsWith(BENCHMARK_PACKAGE_POLICY_PREFIX)
    ? queryParams.sort_field.substring(BENCHMARK_PACKAGE_POLICY_PREFIX.length)
    : queryParams.sort_field;

  return packagePolicyService?.list(soClient, {
    kuery: getPackageNameQuery(packageName, queryParams.benchmark_name),
    page: queryParams.page,
    perPage: queryParams.per_page,
    sortField,
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
export interface RulesStatusAggregation {
  enabled_status: {
    doc_count: number;
  };
}
export const getCspRulesStatus = (
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy
): Promise<SavedObjectsFindResponse<CspRuleType, RulesStatusAggregation>> => {
  const cspRules = soClient.find<CspRuleType, RulesStatusAggregation>({
    type: CSP_RULE_SAVED_OBJECT_TYPE,
    filter: createCspRuleSearchFilterByPackagePolicy({
      packagePolicyId: packagePolicy.id,
      policyId: packagePolicy.policy_id,
    }),
    aggs: {
      enabled_status: {
        filter: {
          term: {
            [`${CSP_RULE_SAVED_OBJECT_TYPE}.attributes.enabled`]: true,
          },
        },
      },
    },
    perPage: 0,
  });
  return cspRules;
};

export const addPackagePolicyCspRules = async (
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy
): Promise<CspRulesStatus> => {
  const rules = await getCspRulesStatus(soClient, packagePolicy);
  const packagePolicyRules = {
    all: rules.total,
    enabled: rules.aggregations?.enabled_status.doc_count || 0,
    disabled: rules.total - (rules.aggregations?.enabled_status.doc_count || 0),
  };
  return packagePolicyRules;
};

export const createBenchmarkEntry = (
  agentPolicy: GetAgentPoliciesResponseItem,
  packagePolicy: PackagePolicy,
  cspRulesStatus: CspRulesStatus
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
  rules: cspRulesStatus,
});

const createBenchmarks = (
  soClient: SavedObjectsClientContract,
  agentPolicies: GetAgentPoliciesResponseItem[],
  cspPackagePolicies: PackagePolicy[]
): Promise<Benchmark[]> => {
  const cspPackagePoliciesMap = new Map(
    cspPackagePolicies.map((packagePolicy) => [packagePolicy.id, packagePolicy])
  );
  return Promise.all(
    agentPolicies.flatMap((agentPolicy) => {
      const cspPackagesOnAgent = agentPolicy.package_policies
        .map((pckPolicyId) => {
          if (typeof pckPolicyId === 'string') return cspPackagePoliciesMap.get(pckPolicyId);
        })
        .filter(isNonNullable);
      const benchmarks = cspPackagesOnAgent.map(async (cspPackage) => {
        const cspRulesStatus = await addPackagePolicyCspRules(soClient, cspPackage);
        const benchmark = createBenchmarkEntry(agentPolicy, cspPackage, cspRulesStatus);
        return benchmark;
      });
      return benchmarks;
    })
  );
};

export const defineGetBenchmarksRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: { query: benchmarksInputSchema },
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, request, response) => {
      if (!(await context.fleet).authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const soClient = (await context.core).savedObjects.client;
        const { query } = request;

        const agentService = cspContext.service.agentService;
        const agentPolicyService = cspContext.service.agentPolicyService;
        const packagePolicyService = cspContext.service.packagePolicyService;

        if (!agentPolicyService || !agentService || !packagePolicyService) {
          throw new Error(`Failed to get Fleet services`);
        }

        const cspPackagePolicies = await getCspPackagePolicies(
          soClient,
          packagePolicyService,
          CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
          query
        );

        const agentPolicies = await getAgentPolicies(
          soClient,
          cspPackagePolicies.items,
          agentPolicyService
        );

        const enrichAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
        const benchmarks = await createBenchmarks(
          soClient,
          enrichAgentPolicies,
          cspPackagePolicies.items
        );

        return response.ok({
          body: {
            ...cspPackagePolicies,
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
