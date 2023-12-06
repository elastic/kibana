/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AgentPolicy, ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';
import { CSP_RULE_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  BENCHMARKS_ROUTE_PATH,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  POSTURE_TYPE_ALL,
} from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/schemas/benchmark';
import type { Benchmark } from '../../../common/types';
import {
  getBenchmarkFromPackagePolicy,
  getBenchmarkFilter,
  isNonNullable,
} from '../../../common/utils/helpers';
import { CspRouter } from '../../types';
import {
  getAgentStatusesByAgentPolicies,
  type AgentStatusByAgentPolicyMap,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';
import { BenchmarkId } from '../../../common/types';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const getRulesCountForPolicy = async (
  soClient: SavedObjectsClientContract,
  benchmarkId: BenchmarkId
): Promise<number> => {
  const rules = await soClient.find<CspBenchmarkRule>({
    type: CSP_RULE_SAVED_OBJECT_TYPE,
    filter: getBenchmarkFilter(benchmarkId),
    perPage: 0,
  });

  return rules.total;
};

const createBenchmarks = (
  soClient: SavedObjectsClientContract,
  agentPolicies: AgentPolicy[],
  agentStatusByAgentPolicyId: AgentStatusByAgentPolicyMap,
  cspPackagePolicies: PackagePolicy[]
): Promise<Benchmark[]> => {
  const cspPackagePoliciesMap = new Map(
    cspPackagePolicies.map((packagePolicy) => [packagePolicy.id, packagePolicy])
  );

  return Promise.all(
    agentPolicies.flatMap((agentPolicy) => {
      const cspPackagesOnAgent =
        agentPolicy.package_policies
          ?.map(({ id: pckPolicyId }) => {
            return cspPackagePoliciesMap.get(pckPolicyId);
          })
          .filter(isNonNullable) ?? [];

      const benchmarks = cspPackagesOnAgent.map(async (cspPackage) => {
        const benchmarkId = getBenchmarkFromPackagePolicy(cspPackage.inputs);
        const rulesCount = await getRulesCountForPolicy(soClient, benchmarkId);
        const agentPolicyStatus = {
          id: agentPolicy.id,
          name: agentPolicy.name,
          agents: agentStatusByAgentPolicyId[agentPolicy.id]?.total,
        };
        return {
          package_policy: cspPackage,
          agent_policy: agentPolicyStatus,
          rules_count: rulesCount,
        };
      });

      return benchmarks;
    })
  );
};

export const defineGetBenchmarksRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: BENCHMARKS_ROUTE_PATH,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: benchmarksQueryParamsSchema,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }

        const cspContext = await context.csp;
        const excludeVulnMgmtPackages = true;
        try {
          const packagePolicies: ListResult<PackagePolicy> = await getCspPackagePolicies(
            cspContext.soClient,
            cspContext.packagePolicyService,
            CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
            request.query,
            POSTURE_TYPE_ALL,
            excludeVulnMgmtPackages
          );

          const agentPolicies = await getCspAgentPolicies(
            cspContext.soClient,
            packagePolicies.items,
            cspContext.agentPolicyService
          );

          const agentStatusesByAgentPolicyId = await getAgentStatusesByAgentPolicies(
            cspContext.agentService,
            agentPolicies,
            cspContext.logger
          );

          const benchmarks = await createBenchmarks(
            cspContext.soClient,
            agentPolicies,
            agentStatusesByAgentPolicyId,
            packagePolicies.items
          );

          const getBenchmarkResponse = {
            ...packagePolicies,
            items: benchmarks,
          };

          return response.ok({
            body: getBenchmarkResponse,
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
