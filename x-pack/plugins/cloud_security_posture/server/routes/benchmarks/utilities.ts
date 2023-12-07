/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from '@kbn/core/server';
import {
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import { getSafePostureTypeRuntimeMapping } from '../../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';
import { CspRuleTemplate } from '../../../common/schemas';
import { BenchmarkId, Benchmark, BenchmarkVersion2 } from '../../../common/types';
import {
  getBenchmarkFilter,
  isNonNullable,
  getBenchmarkFromPackagePolicy,
} from '../../../common/utils/helpers';
import { AgentStatusByAgentPolicyMap } from '../../lib/fleet_util';
import { getClusters } from '../compliance_dashboard/get_clusters';
import { getStats } from '../compliance_dashboard/get_stats';

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

export const createBenchmarks = (
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

export const createBenchmarksV2 = async (
  soClient: SavedObjectsClientContract,
  esClient: any,
  logger: Logger
): Promise<BenchmarkVersion2[]> => {
  // Returns a list of benchmark based on their Version and Benchmark ID
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
          const benchmarkScore = await getStats(esClient, query, pitId, runtimeMappings, logger);
          const benchmarkEvaluation = await getClusters(
            esClient,
            query,
            pitId,
            runtimeMappings,
            logger
          );

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
