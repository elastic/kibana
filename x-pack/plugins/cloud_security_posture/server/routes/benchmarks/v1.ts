/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
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
import { createBenchmarks } from './utilities';

export const getBenchmark = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  query: any,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService,
  logger: Logger,
  responseOk?: any,
  responseError?: any
) => {
  const excludeVulnMgmtPackages = true;
  try {
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

    const getBenchmarkResponse = {
      ...packagePolicies,
      items: benchmarks,
    };

    return responseOk({
      body: getBenchmarkResponse,
    });
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to fetch benchmarks ${err}`);
    return responseError({
      body: { message: error.message },
      statusCode: error.statusCode,
    });
  }
};
