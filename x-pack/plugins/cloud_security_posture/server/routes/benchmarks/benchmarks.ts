/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AgentPolicy, ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getSafePostureTypeRuntimeMapping } from '../../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';

import { CspRuleTemplate } from '../../../common/schemas';
import {
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import {
  BENCHMARKS_ROUTE_PATH,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  POSTURE_TYPE_ALL,
} from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/schemas/benchmark';
import type { Benchmark, BenchmarkVersion2 } from '../../../common/types';
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
import { getStats } from '../compliance_dashboard/get_stats';
import { getClusters } from '../compliance_dashboard/get_clusters';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const getRulesCountForPolicy = async (
  soClient: SavedObjectsClientContract,
  benchmarkId: BenchmarkId
): Promise<number> => {
  const rules = await soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
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

const getBenchmarks = async (
  soClient: SavedObjectsClientContract,
  cspContext?: any
): Promise<BenchmarkVersion2[]> => {
  // Returns a list of benchmark based on their Version and Benchmark ID
  const esClient = cspContext.esClient.asCurrentUser;
  const benchmarksResponse = await soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    aggs: {
      benchmark_id: {
        terms: {
          field: `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id`,
        },
        aggs: {
          name: {
            terms: {
              field: `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.name`,
            },
            aggs: {
              version: {
                terms: {
                  field: `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.version`,
                },
              },
            },
          },
        },
      },
    },
    perPage: 0,
  });

  const benchmarkAgg: any = benchmarksResponse.aggregations;

  const { id: pitId } = await esClient.openPointInTime({
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    keep_alive: '30s',
  });
  // Transform response to a benchmark row: {id, name, version}
  // For each Benchmark entry : Calculate Score, Get amount of enrolled agents
  const result = await Promise.all(
    benchmarkAgg.benchmark_id.buckets.flatMap(async (benchmark: any) => {
      const benchmarkId = benchmark.key;
      const benchmarkName = benchmark.name.buckets[0].key;

      const benchmarksTableObjects = await Promise.all(
        benchmark?.name?.buckets[0]?.version?.buckets.flatMap(async (benchmarkObj: any) => {
          const benchmarkVersion = benchmarkObj.key;
          const postureType =
            benchmarkId === 'cis_eks' || benchmarkId === 'cis_k8s' ? 'kspm' : 'cspm';
          const runtimeMappings: MappingRuntimeFields = getSafePostureTypeRuntimeMapping();
          const query: QueryDslQueryContainer = {
            bool: {
              filter: [
                { term: { 'rule.benchmark.id': benchmarkId } },
                { term: { 'rule.benchmark.version': benchmarkVersion } },
                { term: { safe_posture_type: postureType } },
              ],
            },
          };
          const benchmarkScore = await getStats(esClient, query, pitId, runtimeMappings);
          const benchmarkEvaluation = await getClusters(esClient, query, pitId, runtimeMappings);

          return {
            id: benchmarkId,
            name: benchmarkName,
            version: benchmarkVersion.replace('v', ''),
            score: benchmarkScore,
            evaluation: benchmarkEvaluation.length,
          };
        })
      );
      return benchmarksTableObjects;
    })
  );
  return result.flat();
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
    )
    .addVersion(
      {
        version: '2',
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

          const benchmarksVersion2 = await getBenchmarks(cspContext.soClient, cspContext);
          const getBenchmarkResponse = {
            ...packagePolicies,
            items: benchmarksVersion2,
            items_policies_information: benchmarks,
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
