/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map, uniq } from 'lodash';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import type {
  AgentPolicy,
  GetAgentStatusResponse,
  ListResult,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { errors } from '@elastic/elasticsearch';
import { PosturePolicyTemplate } from '../../common/types';
import { SUPPORTED_POLICY_TEMPLATES } from '../../common/constants';
import { CSP_FLEET_PACKAGE_KUERY } from '../../common/utils/helpers';
import {
  BENCHMARK_PACKAGE_POLICY_PREFIX,
  BenchmarksQueryParams,
} from '../../common/schemas/benchmark';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const isFleetMissingAgentHttpError = (error: unknown) =>
  error instanceof errors.ResponseError && error.statusCode === 404;

const isPolicyTemplate = (input: any): input is PosturePolicyTemplate =>
  SUPPORTED_POLICY_TEMPLATES.includes(input);

const getPackageNameQuery = (packageName: string, benchmarkFilter?: string): string => {
  const integrationNameQuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`;
  const kquery = benchmarkFilter
    ? `${integrationNameQuery} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: *${benchmarkFilter}*`
    : integrationNameQuery;

  return kquery;
};

export type AgentStatusByAgentPolicyMap = Record<string, GetAgentStatusResponse['results']>;

export const getAgentStatusesByAgentPolicies = async (
  agentService: AgentService,
  agentPolicies: AgentPolicy[] | undefined,
  logger: Logger
): Promise<AgentStatusByAgentPolicyMap> => {
  if (!agentPolicies?.length) return {};

  const internalAgentService = agentService.asInternalUser;
  const result: AgentStatusByAgentPolicyMap = {};

  try {
    for (const agentPolicy of agentPolicies) {
      result[agentPolicy.id] = await internalAgentService.getAgentStatusForAgentPolicy(
        agentPolicy.id
      );
    }
  } catch (error) {
    if (isFleetMissingAgentHttpError(error)) {
      logger.debug('failed to get agent status for agent policy');
    } else {
      throw error;
    }
  }

  return result;
};

export const getCspAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface
): Promise<AgentPolicy[]> =>
  agentPolicyService.getByIds(soClient, uniq(map(packagePolicies, 'policy_id')), {
    withPackagePolicies: true,
    ignoreMissing: true,
  });

export const getCspPackagePolicies = (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  packageName: string,
  queryParams: Partial<BenchmarksQueryParams>
): Promise<ListResult<PackagePolicy>> => {
  const sortField = queryParams.sort_field?.replaceAll(BENCHMARK_PACKAGE_POLICY_PREFIX, '');

  return packagePolicyService.list(soClient, {
    kuery: getPackageNameQuery(packageName, queryParams.benchmark_name),
    page: queryParams.page,
    perPage: queryParams.per_page,
    sortField,
    sortOrder: queryParams.sort_order,
  });
};

export const getInstalledPolicyTemplates = async (
  packagePolicyClient: PackagePolicyClient,
  soClient: SavedObjectsClientContract
) => {
  try {
    // getting all installed csp package policies
    const queryResult = await packagePolicyClient.list(soClient, {
      kuery: CSP_FLEET_PACKAGE_KUERY,
      perPage: 1000,
    });

    // getting installed policy templates by findings enabled inputs
    const enabledPolicyTemplates = queryResult.items
      .map((policy) => {
        return policy.inputs.find((input) => input.enabled)?.policy_template;
      })
      .filter(isPolicyTemplate);

    // removing duplicates
    return [...new Set(enabledPolicyTemplates)];
  } catch (e) {
    return [];
  }
};
