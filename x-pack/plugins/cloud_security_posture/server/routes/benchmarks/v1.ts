/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ListResult, PackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import type { Logger } from '@kbn/core/server';
import {
  PackagePolicyClient,
  AgentPolicyServiceInterface,
  AgentService,
} from '@kbn/fleet-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME, POSTURE_TYPE_ALL } from '../../../common/constants';
import { isNonNullable, getBenchmarkFromPackagePolicy } from '../../../common/utils/helpers';
import { AgentStatusByAgentPolicyMap } from '../../lib/fleet_util';
import {
  getCspPackagePolicies,
  getCspAgentPolicies,
  getAgentStatusesByAgentPolicies,
} from '../../lib/fleet_util';
import { getRulesCountForPolicy } from './utilities';
import { Benchmark } from '../../../common/types/benchmarks/v1';

export const getBenchmarksData = (
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
          agents: agentStatusByAgentPolicyId[agentPolicy.id]?.active,
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

export const getBenchmarks = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  query: any,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService,
  logger: Logger
) => {
  const excludeVulnMgmtPackages = true;

  const packagePolicies: ListResult<PackagePolicy> = await getCspPackagePolicies(
    soClient,
    packagePolicyService,
    CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    query,
    POSTURE_TYPE_ALL,
    excludeVulnMgmtPackages
  );

  const agentPolicies = await getCspAgentPolicies(
    soClient,
    packagePolicies.items,
    agentPolicyService
  );

  const agentStatusesByAgentPolicyId = await getAgentStatusesByAgentPolicies(
    agentService,
    agentPolicies,
    logger
  );

  const benchmarks = await getBenchmarksData(
    soClient,
    agentPolicies,
    agentStatusesByAgentPolicyId,
    packagePolicies.items
  );

  const getBenchmarkResponse = {
    ...packagePolicies,
    items: benchmarks,
  };

  return getBenchmarkResponse;
};
