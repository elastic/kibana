/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract, Logger, ElasticsearchClient } from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyClient,
  PackageService,
} from '@kbn/fleet-plugin/server';
import moment from 'moment';
import { Installation, PackagePolicy } from '@kbn/fleet-plugin/common';
import { schema } from '@kbn/config-schema';
import { VersionedRoute } from '@kbn/core-http-server/src/versioning/types';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  STATUS_ROUTE_PATH,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  FINDINGS_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  VULNERABILITIES_INDEX_PATTERN,
  KSPM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  POSTURE_TYPES,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import type {
  CspApiRequestHandlerContext,
  CspRequestHandlerContext,
  CspRouter,
  StatusResponseInfo,
} from '../../types';
import type {
  CspSetupStatus,
  CspStatusCode,
  IndexStatus,
  PostureTypes,
} from '../../../common/types';
import {
  getAgentStatusesByAgentPolicies,
  getCspAgentPolicies,
  getCspPackagePolicies,
  getInstalledPolicyTemplates,
} from '../../lib/fleet_util';
import { checkIndexStatus } from '../../lib/check_index_status';

export const INDEX_TIMEOUT_IN_MINUTES = 10;
export const INDEX_TIMEOUT_IN_MINUTES_CNVM = 240;

interface CspStatusDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  agentPolicyService: AgentPolicyServiceInterface;
  agentService: AgentService;
  packagePolicyService: PackagePolicyClient;
  packageService: PackageService;
  isPluginInitialized(): boolean;
}

const calculateDiffFromNowInMinutes = (date: string | number): number =>
  moment().diff(moment(date), 'minutes');

const getHealthyAgents = async (
  soClient: SavedObjectsClientContract,
  installedCspPackagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService,
  logger: Logger
): Promise<number> => {
  // Get agent policies of package policies (from installed package policies)
  const agentPolicies = await getCspAgentPolicies(
    soClient,
    installedCspPackagePolicies,
    agentPolicyService
  );

  // Get agents statuses of the following agent policies
  const agentStatusesByAgentPolicyId = await getAgentStatusesByAgentPolicies(
    agentService,
    agentPolicies,
    logger
  );

  return Object.values(agentStatusesByAgentPolicyId).reduce(
    (sum, status) => sum + status.online + status.updating,
    0
  );
};

export const calculateIntegrationStatus = (
  integration: PostureTypes,
  indicesStatus: {
    latest: IndexStatus;
    stream: IndexStatus;
    score?: IndexStatus;
  },
  installation: Installation | undefined,
  healthyAgents: number,
  timeSinceInstallationInMinutes: number,
  installedPolicyTemplates: string[]
): CspStatusCode => {
  // We check privileges only for the relevant indices for our pages to appear
  const postureTypeCheck: PostureTypes = POSTURE_TYPES[integration];

  if (indicesStatus.latest === 'unprivileged' || indicesStatus.score === 'unprivileged')
    return 'unprivileged';
  if (!installation) return 'not-installed';
  if (indicesStatus.latest === 'not-empty') return 'indexed';
  if (indicesStatus.stream === 'not-empty' && indicesStatus.latest === 'empty') return 'indexing';

  if (!installedPolicyTemplates.includes(postureTypeCheck)) return 'not-installed';
  if (healthyAgents === 0) return 'not-deployed';
  if (
    indicesStatus.latest === 'empty' &&
    indicesStatus.stream === 'empty' &&
    timeSinceInstallationInMinutes <
      (postureTypeCheck !== VULN_MGMT_POLICY_TEMPLATE
        ? INDEX_TIMEOUT_IN_MINUTES
        : INDEX_TIMEOUT_IN_MINUTES_CNVM)
  )
    return 'waiting_for_results';

  return 'index-timeout';
};

const assertResponse = (resp: CspSetupStatus, logger: CspApiRequestHandlerContext['logger']) => {
  if (
    (resp.cspm.status || resp.kspm.status) === 'unprivileged' &&
    !resp.indicesDetails.some((idxDetails) => idxDetails.status === 'unprivileged')
  ) {
    logger.warn('Returned status in `unprivileged` but response is missing the unprivileged index');
  }
};

export const getCspStatus = async ({
  logger,
  esClient,
  soClient,
  packageService,
  packagePolicyService,
  agentPolicyService,
  agentService,
  isPluginInitialized,
}: CspStatusDependencies): Promise<CspSetupStatus> => {
  const [
    findingsLatestIndexStatus,
    findingsIndexStatus,
    scoreIndexStatus,
    findingsLatestIndexStatusCspm,
    findingsIndexStatusCspm,
    scoreIndexStatusCspm,
    findingsLatestIndexStatusKspm,
    findingsIndexStatusKspm,
    scoreIndexStatusKspm,
    vulnerabilitiesLatestIndexStatus,
    vulnerabilitiesIndexStatus,
    installation,
    latestCspPackage,
    installedPackagePoliciesKspm,
    installedPackagePoliciesCspm,
    installedPackagePoliciesVulnMgmt,
    installedPolicyTemplates,
  ] = await Promise.all([
    checkIndexStatus(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS, logger),
    checkIndexStatus(esClient, FINDINGS_INDEX_PATTERN, logger),
    checkIndexStatus(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS, logger),

    checkIndexStatus(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS, logger, 'cspm'),
    checkIndexStatus(esClient, FINDINGS_INDEX_PATTERN, logger, 'cspm'),
    checkIndexStatus(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS, logger, 'cspm'),

    checkIndexStatus(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS, logger, 'kspm'),
    checkIndexStatus(esClient, FINDINGS_INDEX_PATTERN, logger, 'kspm'),
    checkIndexStatus(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS, logger, 'kspm'),

    checkIndexStatus(esClient, LATEST_VULNERABILITIES_INDEX_DEFAULT_NS, logger),
    checkIndexStatus(esClient, VULNERABILITIES_INDEX_PATTERN, logger, VULN_MGMT_POLICY_TEMPLATE),

    packageService.asInternalUser.getInstallation(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
    packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),

    getCspPackagePolicies(
      soClient,
      packagePolicyService,
      CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
      {
        per_page: 10000,
      },
      KSPM_POLICY_TEMPLATE
    ),
    getCspPackagePolicies(
      soClient,
      packagePolicyService,
      CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
      {
        per_page: 10000,
      },
      CSPM_POLICY_TEMPLATE
    ),
    getCspPackagePolicies(
      soClient,
      packagePolicyService,
      CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
      {
        per_page: 10000,
      },
      VULN_MGMT_POLICY_TEMPLATE
    ),
    getInstalledPolicyTemplates(packagePolicyService, soClient),
  ]);
  const healthyAgentsKspm = await getHealthyAgents(
    soClient,
    installedPackagePoliciesKspm.items,
    agentPolicyService,
    agentService,
    logger
  );

  const healthyAgentsCspm = await getHealthyAgents(
    soClient,
    installedPackagePoliciesCspm.items,
    agentPolicyService,
    agentService,
    logger
  );

  const healthyAgentsVulMgmt = await getHealthyAgents(
    soClient,
    installedPackagePoliciesVulnMgmt.items,
    agentPolicyService,
    agentService,
    logger
  );
  const installedPackagePoliciesTotalKspm = installedPackagePoliciesKspm.total;
  const installedPackagePoliciesTotalCspm = installedPackagePoliciesCspm.total;
  const installedPackagePoliciesTotalVulnMgmt = installedPackagePoliciesVulnMgmt.total;

  const latestCspPackageVersion = latestCspPackage.version;

  const MIN_DATE = 0;
  const indicesDetails = [
    {
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
      status: findingsLatestIndexStatus,
    },
    {
      index: FINDINGS_INDEX_PATTERN,
      status: findingsIndexStatus,
    },
    {
      index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      status: scoreIndexStatus,
    },
    {
      index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
      status: vulnerabilitiesLatestIndexStatus,
    },
  ];

  const statusCspm = calculateIntegrationStatus(
    CSPM_POLICY_TEMPLATE,
    {
      latest: findingsLatestIndexStatusCspm,
      stream: findingsIndexStatusCspm,
      score: scoreIndexStatusCspm,
    },
    installation,
    healthyAgentsCspm,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE),
    installedPolicyTemplates
  );

  const statusKspm = calculateIntegrationStatus(
    KSPM_POLICY_TEMPLATE,
    {
      latest: findingsLatestIndexStatusKspm,
      stream: findingsIndexStatusKspm,
      score: scoreIndexStatusKspm,
    },
    installation,
    healthyAgentsKspm,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE),
    installedPolicyTemplates
  );

  const statusVulnMgmt = calculateIntegrationStatus(
    VULN_MGMT_POLICY_TEMPLATE,
    {
      latest: vulnerabilitiesLatestIndexStatus,
      stream: vulnerabilitiesIndexStatus,
    },
    installation,
    healthyAgentsVulMgmt,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE),
    installedPolicyTemplates
  );

  const statusResponseInfo: CspSetupStatus = getStatusResponse({
    statusCspm,
    statusKspm,
    statusVulnMgmt,
    healthyAgentsCspm,
    healthyAgentsKspm,
    healthyAgentsVulMgmt,
    installedPackagePoliciesTotalKspm,
    installedPackagePoliciesTotalCspm,
    installedPackagePoliciesTotalVulnMgmt,
    indicesDetails,
    latestCspPackageVersion,
    isPluginInitialized: isPluginInitialized(),
  });

  const response: CspSetupStatus = {
    ...statusResponseInfo,
    installedPackageVersion: installation?.install_version,
  };

  assertResponse(response, logger);
  return response;
};

export const statusQueryParamsSchema = schema.object({
  /**
   * CSP Plugin initialization includes creating indices/transforms/tasks.
   * Prior to this initialization, the plugin is not ready to index findings.
   */
  check: schema.oneOf([schema.literal('all'), schema.literal('init')], { defaultValue: 'all' }),
});

export const defineGetCspStatusRoute = (
  router: CspRouter
): VersionedRoute<'get', CspRequestHandlerContext> =>
  router.versioned
    .get({
      access: 'internal',
      path: STATUS_ROUTE_PATH,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: statusQueryParamsSchema,
          },
        },
      },
      async (context, request, response) => {
        const cspContext = await context.csp;
        try {
          if (request.query.check === 'init') {
            return response.ok({
              body: {
                isPluginInitialized: cspContext.isPluginInitialized(),
              },
            });
          }
          const status: CspSetupStatus = await getCspStatus({
            ...cspContext,
            esClient: cspContext.esClient.asCurrentUser,
          });
          return response.ok({
            body: status,
          });
        } catch (err) {
          cspContext.logger.error(`Error getting csp status`);
          cspContext.logger.error(err);

          const error = transformError(err);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );

const getStatusResponse = (statusResponseInfo: StatusResponseInfo) => {
  const {
    statusCspm,
    statusKspm,
    statusVulnMgmt,
    healthyAgentsCspm,
    healthyAgentsKspm,
    healthyAgentsVulMgmt,
    installedPackagePoliciesTotalKspm,
    installedPackagePoliciesTotalCspm,
    installedPackagePoliciesTotalVulnMgmt,
    indicesDetails,
    latestCspPackageVersion,
    isPluginInitialized,
  }: StatusResponseInfo = statusResponseInfo;
  return {
    [CSPM_POLICY_TEMPLATE]: {
      status: statusCspm,
      healthyAgents: healthyAgentsCspm,
      installedPackagePolicies: installedPackagePoliciesTotalCspm,
    },
    [KSPM_POLICY_TEMPLATE]: {
      status: statusKspm,
      healthyAgents: healthyAgentsKspm,
      installedPackagePolicies: installedPackagePoliciesTotalKspm,
    },
    [VULN_MGMT_POLICY_TEMPLATE]: {
      status: statusVulnMgmt,
      healthyAgents: healthyAgentsVulMgmt,
      installedPackagePolicies: installedPackagePoliciesTotalVulnMgmt,
    },
    indicesDetails,
    isPluginInitialized,
    latestPackageVersion: latestCspPackageVersion,
  };
};
