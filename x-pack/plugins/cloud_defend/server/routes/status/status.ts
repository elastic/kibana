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
import {
  ALERTS_INDEX_PATTERN,
  INTEGRATION_PACKAGE_NAME,
  STATUS_ROUTE_PATH,
} from '../../../common/constants';
import type { CloudDefendApiRequestHandlerContext, CloudDefendRouter } from '../../types';
import type {
  CloudDefendSetupStatus,
  CloudDefendStatusCode,
  IndexStatus,
} from '../../../common/types';
import {
  getAgentStatusesByAgentPolicies,
  getCloudDefendAgentPolicies,
  getCloudDefendPackagePolicies,
  getInstalledPolicyTemplates,
} from '../../lib/fleet_util';
import { checkIndexStatus } from '../../lib/check_index_status';

export const INDEX_TIMEOUT_IN_MINUTES = 10;

const calculateDiffFromNowInMinutes = (date: string | number): number =>
  moment().diff(moment(date), 'minutes');

const getHealthyAgents = async (
  soClient: SavedObjectsClientContract,
  installedCloudDefendPackagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService,
  logger: Logger
): Promise<number> => {
  // Get agent policies of package policies (from installed package policies)
  const agentPolicies = await getCloudDefendAgentPolicies(
    soClient,
    installedCloudDefendPackagePolicies,
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

const calculateCloudDefendStatusCode = (
  indicesStatus: {
    alerts: IndexStatus;
  },
  installedCloudDefendPackagePolicies: number,
  healthyAgents: number,
  timeSinceInstallationInMinutes: number
): CloudDefendStatusCode => {
  // We check privileges only for the relevant indices for our pages to appear
  if (indicesStatus.alerts === 'unprivileged') return 'unprivileged';
  if (indicesStatus.alerts === 'not-empty') return 'indexed';
  if (installedCloudDefendPackagePolicies === 0) return 'not-installed';
  if (healthyAgents === 0) return 'not-deployed';
  if (timeSinceInstallationInMinutes <= INDEX_TIMEOUT_IN_MINUTES) return 'indexing';
  if (timeSinceInstallationInMinutes > INDEX_TIMEOUT_IN_MINUTES) return 'index-timeout';

  throw new Error('Could not determine cloud defend status');
};

const assertResponse = (
  resp: CloudDefendSetupStatus,
  logger: CloudDefendApiRequestHandlerContext['logger']
) => {
  if (
    resp.status === 'unprivileged' &&
    !resp.indicesDetails.some((idxDetails) => idxDetails.status === 'unprivileged')
  ) {
    logger.warn('Returned status in `unprivileged` but response is missing the unprivileged index');
  }
};

const getCloudDefendStatus = async ({
  logger,
  esClient,
  soClient,
  packageService,
  packagePolicyService,
  agentPolicyService,
  agentService,
}: CloudDefendApiRequestHandlerContext): Promise<CloudDefendSetupStatus> => {
  const [
    alertsIndexStatus,
    installation,
    latestCloudDefendPackage,
    installedPackagePolicies,
    installedPolicyTemplates,
  ] = await Promise.all([
    checkIndexStatus(esClient.asCurrentUser, ALERTS_INDEX_PATTERN, logger),
    packageService.asInternalUser.getInstallation(INTEGRATION_PACKAGE_NAME),
    packageService.asInternalUser.fetchFindLatestPackage(INTEGRATION_PACKAGE_NAME),
    getCloudDefendPackagePolicies(soClient, packagePolicyService, INTEGRATION_PACKAGE_NAME, {
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
  const latestCloudDefendPackageVersion = latestCloudDefendPackage.version;

  const MIN_DATE = 0;
  const indicesDetails = [
    {
      index: ALERTS_INDEX_PATTERN,
      status: alertsIndexStatus,
    },
  ];

  const status = calculateCloudDefendStatusCode(
    {
      alerts: alertsIndexStatus,
    },
    installedPackagePoliciesTotal,
    healthyAgents,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE)
  );

  if (status === 'not-installed')
    return {
      status,
      indicesDetails,
      latestPackageVersion: latestCloudDefendPackageVersion,
      healthyAgents,
      installedPackagePolicies: installedPackagePoliciesTotal,
    };

  const response = {
    status,
    indicesDetails,
    latestPackageVersion: latestCloudDefendPackageVersion,
    healthyAgents,
    installedPolicyTemplates,
    installedPackagePolicies: installedPackagePoliciesTotal,
    installedPackageVersion: installation?.install_version,
  };

  assertResponse(response, logger);
  return response;
};

export const defineGetCloudDefendStatusRoute = (router: CloudDefendRouter): void =>
  router.get(
    {
      path: STATUS_ROUTE_PATH,
      validate: {},
      options: {
        tags: ['access:cloud-defend-read'],
      },
    },
    async (context, request, response) => {
      const cloudDefendContext = await context.cloudDefend;
      try {
        const status = await getCloudDefendStatus(cloudDefendContext);
        return response.ok({
          body: status,
        });
      } catch (err) {
        cloudDefendContext.logger.error(`Error getting cloud_defend status`);
        cloudDefendContext.logger.error(err);

        const error = transformError(err);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
