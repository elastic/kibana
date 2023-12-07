/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Logger } from '@kbn/core/server';
import {
  PackagePolicyClient,
  AgentPolicyServiceInterface,
  AgentService,
} from '@kbn/fleet-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME, POSTURE_TYPE_ALL } from '../../../common/constants';
import {
  getCspPackagePolicies,
  getCspAgentPolicies,
  getAgentStatusesByAgentPolicies,
} from '../../lib/fleet_util';
import { createBenchmarks, createBenchmarksV2 } from './utilities';

export const getBenchmarks = async (
  esClient: any,
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

  const benchmarks = await createBenchmarks(
    soClient,
    agentPolicies,
    agentStatusesByAgentPolicyId,
    packagePolicies.items
  );

  const benchmarksVersion2 = await createBenchmarksV2(soClient, esClient);
  const getBenchmarkResponse = {
    ...packagePolicies,
    items: benchmarksVersion2,
    items_policies_information: benchmarks,
    items2: { benchmarksVersion2, benchmarks },
  };
  return getBenchmarkResponse;
};
