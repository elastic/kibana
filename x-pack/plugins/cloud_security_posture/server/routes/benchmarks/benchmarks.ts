/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { CspRuleTemplate } from '../../../common/schemas';
import { CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  BENCHMARKS_ROUTE_PATH,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  POSTURE_TYPE_ALL,
} from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/schemas/benchmark';
import type { Benchmark, GetBenchmarkResponse } from '../../../common/types';
import {
  getBenchmarkFromPackagePolicy,
  getBenchmarkTypeFilter,
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
export interface ResourcesStats {
  benchmarks: {
    buckets: BenchmarkBucket[];
  };
}

interface BenchmarkBucket {
  key: string;
  doc_count: number;
  by_resource_id: {
    buckets: ResourceIdBucket[];
  };
  overall_min_timestamp: {
    value: number;
  };
}

interface ResourceIdBucket {
  key: string;
  doc_count: number;

  earliest_timestamp: {
    value: number;
  };
}

interface ResourceNameBucket {
  key: string;
  doc_count: number;
}
export const getRulesCountForPolicy = async (
  soClient: SavedObjectsClientContract,
  benchmarkId: BenchmarkId
): Promise<number> => {
  const rules = await soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    filter: getBenchmarkTypeFilter(benchmarkId),
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

export const getFindingsByResourceAggQuery = () => ({
  index: 'logs-cloud_security_posture.findings_latest-*',
  query: {
    bool: {
      must: [
        {
          term: {
            'rule.benchmark.posture_type': 'cspm',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-480h',
            },
          },
        },
      ],
    },
  },
  size: 0,
  aggs: {
    benchmarks: {
      terms: {
        field: 'rule.benchmark.name',
      },
      aggs: {
        by_resource_id: {
          terms: {
            field: 'resource.id',
            size: 10000,
          },
          aggs: {
            min_timestamp: {
              min: {
                field: '@timestamp',
              },
            },
          },
        },
        overall_min_timestamp: {
          min_bucket: {
            buckets_path: 'by_resource_id>min_timestamp',
          },
        },
      },
    },
  },
});

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

        try {
          const cspPackagePolicies = await getCspPackagePolicies(
            cspContext.soClient,
            cspContext.packagePolicyService,
            CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
            request.query,
            POSTURE_TYPE_ALL
          );

          const agentPolicies = await getCspAgentPolicies(
            cspContext.soClient,
            cspPackagePolicies.items,
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
            cspPackagePolicies.items
          );

          const getBenchmarkResponse: GetBenchmarkResponse = {
            ...cspPackagePolicies,
            items: benchmarks,
          };

          const response2 = await cspContext.esClient.asCurrentUser.search<unknown, ResourcesStats>(
            getFindingsByResourceAggQuery()
          );

          const cspmBenchmarks = response2.aggregations?.benchmarks.buckets;

          const sumResources = cspmBenchmarks
            ?.map((benchmarkBucket: BenchmarkBucket) => {
              return benchmarkBucket.by_resource_id.buckets.length;
            })
            .reduce((total: number, docCount: number) => total + docCount, 0);

          console.log({ sumResources });
          const earliestTimestampArray = cspmBenchmarks?.map((benchmarkBucket: BenchmarkBucket) => {
            return benchmarkBucket.overall_min_timestamp.value;
          });

          const minTimestamp: number = Math.min(...earliestTimestampArray!);

          console.log({ minTimestamp });

          const minTimestampDate: Date = new Date(minTimestamp!);

          console.log({ minTimestampDate });
          // const humanReadableTimestamp2: string = minTimestampDate.toISOString();
          // const humanReadableTimestamp3: string = minTimestampDate.toLocaleDateString();
          // console.log({ humanReadableTimestamp3 });

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
