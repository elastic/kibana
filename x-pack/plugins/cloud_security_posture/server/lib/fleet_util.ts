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
  PackagePolicyInput,
} from '@kbn/fleet-plugin/common';
import { errors } from '@elastic/elasticsearch';
import { CloudSecurityPolicyTemplate, PostureTypes } from '../../common/types_old';
import {
  SUPPORTED_POLICY_TEMPLATES,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  KSPM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
} from '../../common/constants';
import { CSP_FLEET_PACKAGE_KUERY } from '../../common/utils/helpers';
import {
  BENCHMARK_PACKAGE_POLICY_PREFIX,
  BenchmarksQueryParams,
  DEFAULT_BENCHMARKS_PER_PAGE,
} from '../../common/types/benchmarks/v1';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const isFleetMissingAgentHttpError = (error: unknown) =>
  error instanceof errors.ResponseError && error.statusCode === 404;

const isPolicyTemplate = (input: any): input is CloudSecurityPolicyTemplate =>
  SUPPORTED_POLICY_TEMPLATES.includes(input);

const getPackageNameQuery = (): string => {
  return `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}"`;
};
const getPaginatedItems = <T>(filteredItems: T[], page: number, perPage: number) => {
  return filteredItems.slice((page - 1) * perPage, Math.min(filteredItems.length, page * perPage));
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

export const getCspPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  packageName: string,
  queryParams: Partial<BenchmarksQueryParams>,
  postureType: PostureTypes,
  excludeVulnMgmtPackages = false
): Promise<ListResult<PackagePolicy>> => {
  const sortField = queryParams.sort_field?.replaceAll(BENCHMARK_PACKAGE_POLICY_PREFIX, '');

  const allCSPPackages = await packagePolicyService.list(soClient, {
    kuery: getPackageNameQuery(),
    page: 1,
    perPage: 10000,
    sortField,
    sortOrder: queryParams.sort_order,
  });

  const filterPackagesByCriteria = (input: PackagePolicyInput) => {
    const showCSPMKSPMPackagesPolicies =
      input.enabled &&
      (input.policy_template === KSPM_POLICY_TEMPLATE ||
        input.policy_template === CSPM_POLICY_TEMPLATE);

    const showAllPackages = input.enabled;

    const showSelectedPostureTypePackages = input.enabled && input.policy_template === postureType;

    if (excludeVulnMgmtPackages) {
      return showCSPMKSPMPackagesPolicies;
    }
    if (postureType === 'all') {
      return showAllPackages;
    }

    return showSelectedPostureTypePackages;
  };

  const filteredItems = allCSPPackages.items.filter(
    (pkg) =>
      pkg.inputs.filter((input) => filterPackagesByCriteria(input)).length > 0 &&
      (!queryParams.package_policy_name ||
        pkg.name.toLowerCase().includes(queryParams.package_policy_name.toLowerCase()))
  );

  const page = queryParams?.page ?? 1;
  const perPage = queryParams?.per_page ?? DEFAULT_BENCHMARKS_PER_PAGE;

  return {
    items: getPaginatedItems(filteredItems, page, perPage),
    total: filteredItems.length,
    page,
    perPage,
  };
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
