/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import type { GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';
import moment from 'moment';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  INFO_ROUTE_PATH,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import type { CspAppContext } from '../../plugin';
import type { CspRouter } from '../../types';
import type { CspSetupStatus, Status } from '../../../common/types';
import {
  addRunningAgentToAgentPolicy,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';

export const INDEX_TIMEOUT_IN_MINUTES = 10;

const isFindingsIndexExists = async (esClient: ElasticsearchClient): Promise<boolean> => {
  try {
    const latestFindingsIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    return latestFindingsIndexExists;
  } catch (e) {
    return false;
  }
};

const getHealthyAgents = (enrichedAgentPolicies: GetAgentPoliciesResponseItem[]): number =>
  enrichedAgentPolicies.reduce(
    (previousValue, currentValue) => previousValue + (currentValue.agents || 0),
    0
  );

const getTimePassedSinceDate = (date: Date | string): number =>
  moment().diff(moment(date), 'minutes');

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

  throw new Error('could not determine csp setup status');
};

const getCspSetupStatus = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packageService: PackageService,
  packagePolicyService: PackagePolicyServiceInterface,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
): Promise<CspSetupStatus> => {
  const [findingsIndexExists, installedPackageInfo, latestPackageInfo, installedIntegrations] =
    await Promise.all([
      isFindingsIndexExists(esClient),
      packageService.asInternalUser.getInstallation(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      getCspPackagePolicies(soClient, packagePolicyService, CLOUD_SECURITY_POSTURE_PACKAGE_NAME, {
        per_page: 10000,
      }),
    ]);
  if (!installedPackageInfo) throw new Error('package installation info could not be found');

  const agentPolicies = await getCspAgentPolicies(
    soClient,
    installedIntegrations.items,
    agentPolicyService
  );

  const enrichedAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
  const healthyAgents = getHealthyAgents(enrichedAgentPolicies);
  const installedIntegrationsTotal = installedIntegrations.total;
  const latestPackageVersion = latestPackageInfo.version;

  const status = getStatus(
    findingsIndexExists,
    installedIntegrationsTotal,
    healthyAgents,
    getTimePassedSinceDate(installedPackageInfo.install_started_at)
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
    installedPackageVersion: installedPackageInfo.install_version,
  };
};

export const defineGetCspSetupStatusRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: INFO_ROUTE_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;

        const packageService = cspContext.service.packageService;
        const agentService = cspContext.service.agentService;
        const agentPolicyService = cspContext.service.agentPolicyService;
        const packagePolicyService = cspContext.service.packagePolicyService;

        if (!agentPolicyService || !agentService || !packagePolicyService || !packageService) {
          throw new Error(`Failed to get Fleet services`);
        }

        const cspSetupStatus = await getCspSetupStatus(
          esClient,
          soClient,
          packageService,
          packagePolicyService,
          agentPolicyService,
          agentService
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
