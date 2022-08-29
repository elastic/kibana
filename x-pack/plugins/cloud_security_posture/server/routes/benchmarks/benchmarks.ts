/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  BENCHMARKS_ROUTE_PATH,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CSP_RULE_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/schemas/benchmark';
import type { Benchmark, CspRulesStatus, AgentPolicyStatus } from '../../../common/types';
import type { CspRule } from '../../../common/schemas';
import {
  createCspRuleSearchFilterByPackagePolicy,
  isNonNullable,
} from '../../../common/utils/helpers';
import { CspRouter } from '../../types';
import {
  getAgentStatusesByAgentPolicies,
  type AgentStatusByAgentPolicyMap,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export interface RulesStatusAggregation {
  enabled_status: {
    doc_count: number;
  };
}

export const getCspRulesStatus = (
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy
): Promise<SavedObjectsFindResponse<CspRule, RulesStatusAggregation>> => {
  const cspRules = soClient.find<CspRule, RulesStatusAggregation>({
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
  agentPolicyStatus: AgentPolicyStatus,
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
  agent_policy: agentPolicyStatus,
  rules: cspRulesStatus,
});

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
        const cspRulesStatus = await addPackagePolicyCspRules(soClient, cspPackage);
        const agentPolicyStatus = {
          id: agentPolicy.id,
          name: agentPolicy.name,
          agents: agentStatusByAgentPolicyId[agentPolicy.id].total,
        };
        const benchmark = createBenchmarkEntry(agentPolicyStatus, cspPackage, cspRulesStatus);
        return benchmark;
      });

      return benchmarks;
    })
  );
};

export const defineGetBenchmarksRoute = (router: CspRouter): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: { query: benchmarksQueryParamsSchema },
      options: {
        tags: ['access:cloud-security-posture-read'],
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
          request.query
        );

        const agentPolicies = await getCspAgentPolicies(
          cspContext.soClient,
          cspPackagePolicies.items,
          cspContext.agentPolicyService
        );

        const agentStatusesByAgentPolicyId = await getAgentStatusesByAgentPolicies(
          cspContext.agentService,
          agentPolicies
        );

        const benchmarks = await createBenchmarks(
          cspContext.soClient,
          agentPolicies,
          agentStatusesByAgentPolicyId,
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
