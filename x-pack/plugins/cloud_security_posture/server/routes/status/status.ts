/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import { Installation, ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  INFO_ROUTE_PATH,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { CspRouter } from '../../types';
import { CspSetupStatus, Status } from '../../../common/types';
import {
  addRunningAgentToAgentPolicy,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';

export const INDEX_TIMEOUT_IN_HOURS = 5;

const isFindingsExists = async (esClient: ElasticsearchClient): Promise<boolean> => {
  try {
    const queryResult = await esClient.search({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
      query: {
        match_all: {},
      },
      size: 1,
    });

    const hasLatestFinding = !!queryResult.hits.hits.length;

    return hasLatestFinding ? true : false;
  } catch (e) {
    return false;
  }
};

const isCspPackageInstalledOnAgentPolicy = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface
): Promise<ListResult<PackagePolicy>> => {
  const cspPackagePolicies = getCspPackagePolicies(
    soClient,
    packagePolicyService,
    CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    { per_page: 10000 }
  );

  return cspPackagePolicies;
};

const getHealthyAgents = async (
  soClient: SavedObjectsClientContract,
  cspPackagePolicies: ListResult<PackagePolicy>,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
): Promise<number> => {
  const agentPolicies = await getCspAgentPolicies(
    soClient,
    cspPackagePolicies.items,
    agentPolicyService
  );
  const enrichAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
  const initialValue = 0;
  const totalAgents = enrichAgentPolicies
    .map((agentPolicy) => (agentPolicy.agents ? agentPolicy.agents : 0))
    .reduce((previousValue, currentValue) => previousValue + currentValue, initialValue);

  return totalAgents;
};

const getTimeDelta = (packageInfo: Installation): number => {
  const installTime = packageInfo!.install_started_at;
  const dt = (new Date().getTime() - new Date(installTime).getTime()) / (1000 * 60 * 60);

  return dt;
};

const geCspIndexStatus = async (
  esClient: ElasticsearchClient,
  installedIntegrations: number,
  healthyAgents: number,
  timeDelta: number
): Promise<Status> => {
  if (await isFindingsExists(esClient)) return 'indexed';

  if (installedIntegrations > 0) {
    if (healthyAgents === 0) return 'not deployed';

    if (timeDelta < INDEX_TIMEOUT_IN_HOURS) return 'indexing';

    return 'index timeout';
  }

  return 'not installed';
};

const getCspSetupStatus = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packageService: PackageService,
  packagePolicyService: PackagePolicyServiceInterface,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
): Promise<CspSetupStatus> => {
  const packageInfo = await packageService.asInternalUser.getInstallation(
    CLOUD_SECURITY_POSTURE_PACKAGE_NAME
  );

  const cspPackageInstalled = await isCspPackageInstalledOnAgentPolicy(
    soClient,
    packagePolicyService
  );

  const healthyAgents = await getHealthyAgents(
    soClient,
    cspPackageInstalled,
    agentPolicyService,
    agentService
  );

  const latestPkgVersion = (
    await packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME)
  )?.version;

  const timeDelta = packageInfo ? await getTimeDelta(packageInfo) : 0;

  const status = await geCspIndexStatus(
    esClient,
    cspPackageInstalled.total,
    healthyAgents,
    timeDelta
  );

  return {
    status,
    latest_pkg_ver: latestPkgVersion,
    installed_integration: cspPackageInstalled.total,
    healthy_agents: healthyAgents,
    installed_pkg_ver: packageInfo?.install_version,
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

        const body: CspSetupStatus = {
          ...cspSetupStatus,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching findings status: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
