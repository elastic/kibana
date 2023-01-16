/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { AgentPolicyServiceInterface, AgentService } from '@kbn/fleet-plugin/server';
import moment from 'moment';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { schema } from '@kbn/config-schema';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  STATUS_ROUTE_PATH,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  FINDINGS_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import type { CspApiRequestHandlerContext, CspRouter } from '../../types';
import type { CspSetupStatus, CspStatusCode, IndexStatus } from '../../../common/types';
import {
  getAgentStatusesByAgentPolicies,
  getCspAgentPolicies,
  getCspPackagePolicies,
  getInstalledPolicyTemplates,
} from '../../lib/fleet_util';
import { checkIndexStatus } from '../../lib/check_index_status';

export const INDEX_TIMEOUT_IN_MINUTES = 10;

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

const calculateCspStatusCode = (
  indicesStatus: {
    findingsLatest: IndexStatus;
    findings: IndexStatus;
    score: IndexStatus;
  },
  installedCspPackagePolicies: number,
  healthyAgents: number,
  timeSinceInstallationInMinutes: number
): CspStatusCode => {
  // We check privileges only for the relevant indices for our pages to appear
  if (indicesStatus.findingsLatest === 'unprivileged' || indicesStatus.score === 'unprivileged')
    return 'unprivileged';
  if (indicesStatus.findingsLatest === 'not-empty') return 'indexed';
  if (installedCspPackagePolicies === 0) return 'not-installed';
  if (healthyAgents === 0) return 'not-deployed';
  if (timeSinceInstallationInMinutes <= INDEX_TIMEOUT_IN_MINUTES) return 'indexing';
  if (timeSinceInstallationInMinutes > INDEX_TIMEOUT_IN_MINUTES) return 'index-timeout';

  throw new Error('Could not determine csp status');
};

const assertResponse = (resp: CspSetupStatus, logger: CspApiRequestHandlerContext['logger']) => {
  if (
    resp.status === 'unprivileged' &&
    !resp.indicesDetails.some((idxDetails) => idxDetails.status === 'unprivileged')
  ) {
    logger.warn('Returned status in `unprivileged` but response is missing the unprivileged index');
  }
};

const getCspStatus = async ({
  logger,
  esClient,
  soClient,
  packageService,
  packagePolicyService,
  agentPolicyService,
  agentService,
  isPluginInitialized,
}: CspApiRequestHandlerContext): Promise<CspSetupStatus> => {
  const [
    findingsLatestIndexStatus,
    findingsIndexStatus,
    scoreIndexStatus,
    installation,
    latestCspPackage,
    installedPackagePolicies,
    installedPolicyTemplates,
  ] = await Promise.all([
    checkIndexStatus(esClient.asCurrentUser, LATEST_FINDINGS_INDEX_DEFAULT_NS, logger),
    checkIndexStatus(esClient.asCurrentUser, FINDINGS_INDEX_PATTERN, logger),
    checkIndexStatus(esClient.asCurrentUser, BENCHMARK_SCORE_INDEX_DEFAULT_NS, logger),
    packageService.asInternalUser.getInstallation(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
    packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
    getCspPackagePolicies(soClient, packagePolicyService, CLOUD_SECURITY_POSTURE_PACKAGE_NAME, {
      per_page: 10000,
    }),
    getInstalledPolicyTemplates(packagePolicyService, soClient),
  ]);

  const healthyAgents = await getHealthyAgents(
    soClient,
    installedPackagePolicies.items,
    agentPolicyService,
    agentService,
    logger
  );

  const installedPackagePoliciesTotal = installedPackagePolicies.total;
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
  ];

  const status = calculateCspStatusCode(
    {
      findingsLatest: findingsLatestIndexStatus,
      findings: findingsIndexStatus,
      score: scoreIndexStatus,
    },
    installedPackagePoliciesTotal,
    healthyAgents,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE)
  );

  if (status === 'not-installed')
    return {
      status,
      indicesDetails,
      latestPackageVersion: latestCspPackageVersion,
      installedPolicyTemplates,
      healthyAgents,
      installedPackagePolicies: installedPackagePoliciesTotal,
      isPluginInitialized: isPluginInitialized(),
    };

  const response = {
    status,
    indicesDetails,
    latestPackageVersion: latestCspPackageVersion,
    healthyAgents,
    installedPolicyTemplates,
    installedPackagePolicies: installedPackagePoliciesTotal,
    installedPackageVersion: installation?.install_version,
    isPluginInitialized: isPluginInitialized(),
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

export const defineGetCspStatusRoute = (router: CspRouter): void =>
  router.get(
    {
      path: STATUS_ROUTE_PATH,
      validate: { query: statusQueryParamsSchema },
      options: {
        tags: ['access:cloud-security-posture-read'],
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
        const status = await getCspStatus(cspContext);
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
