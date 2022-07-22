/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import moment, { MomentInput } from 'moment';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME, STATUS_ROUTE_PATH } from '../../../common/constants';
import type { CspRouter } from '../../types';
import type { CspSetupStatus, Status } from '../../../common/types';
import {
  addRunningAgentToAgentPolicy,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';
import { isLatestFindingsIndexExists } from '../../lib/is_latest_findings_index_exists';

export const INDEX_TIMEOUT_IN_MINUTES = 10;

// this function currently returns all agents instead of healthy agents only
const getHealthyAgents = async (
  soClient: SavedObjectsClientContract,
  installedIntegrations: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
): Promise<number> => {
  const agentPolicies = await getCspAgentPolicies(
    soClient,
    installedIntegrations,
    agentPolicyService
  );

  const enrichedAgentPolicies = await addRunningAgentToAgentPolicy(
    agentService,
    agentPolicies || []
  );

  return enrichedAgentPolicies.reduce(
    (previousValue, currentValue) => previousValue + (currentValue.agents || 0),
    0
  );
};

const getMinutesPassedSinceMoment = (momentInput: MomentInput): number =>
  moment().diff(moment(momentInput), 'minutes');

const getStatus = (
  findingsIndexExists: boolean,
  installedIntegrations: number,
  healthyAgents: number,
  minutesPassedSinceInstallation: number
): Status => {
  if (findingsIndexExists) return 'indexed';
  if (installedIntegrations === 0) return 'not-installed';
  if (healthyAgents === 0) return 'not-deployed';
  if (minutesPassedSinceInstallation <= INDEX_TIMEOUT_IN_MINUTES) return 'indexing';
  if (minutesPassedSinceInstallation > INDEX_TIMEOUT_IN_MINUTES) return 'index-timeout';

  throw new Error('Could not determine csp setup status');
};

const getCspSetupStatus = async (
  logger: Logger,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packageService: PackageService,
  packagePolicyService: PackagePolicyServiceInterface,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
): Promise<CspSetupStatus> => {
  const [findingsIndexExists, installationPackageInfo, latestPackageInfo, installedIntegrations] =
    await Promise.all([
      isLatestFindingsIndexExists(esClient, logger),
      packageService.asInternalUser.getInstallation(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      getCspPackagePolicies(soClient, packagePolicyService, CLOUD_SECURITY_POSTURE_PACKAGE_NAME, {
        per_page: 10000,
      }),
    ]);

  const healthyAgents = await getHealthyAgents(
    soClient,
    installedIntegrations.items,
    agentPolicyService,
    agentService
  );

  const installedIntegrationsTotal = installedIntegrations.total;
  const latestPackageVersion = latestPackageInfo.version;

  const status = getStatus(
    findingsIndexExists,
    installedIntegrationsTotal,
    healthyAgents,
    getMinutesPassedSinceMoment(installationPackageInfo?.install_started_at || 0)
  );

  if (status === 'not-installed')
    return {
      status,
      latestPackageVersion,
      healthyAgents,
      installedIntegrations: installedIntegrationsTotal,
    };

  return {
    status,
    latestPackageVersion,
    healthyAgents,
    installedIntegrations: installedIntegrationsTotal,
    installedPackageVersion: installationPackageInfo?.install_version,
  };
};

export const defineGetCspSetupStatusRoute = (router: CspRouter): void =>
  router.get(
    {
      path: STATUS_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, _, response) => {
      const cspContext = await context.csp;
      try {
        const cspSetupStatus = await getCspSetupStatus(
          cspContext.logger,
          cspContext.esClient.asCurrentUser,
          cspContext.soClient,
          cspContext.packageService,
          cspContext.packagePolicyService,
          cspContext.agentPolicyService,
          cspContext.agentService
        );

        const body: CspSetupStatus = cspSetupStatus;

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching status: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
