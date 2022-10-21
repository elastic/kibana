/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicyServiceInterface, AgentService } from '@kbn/fleet-plugin/server';
import moment from 'moment';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME, STATUS_ROUTE_PATH } from '../../../common/constants';
import type { CspApiRequestHandlerContext, CspRouter } from '../../types';
import type { CspSetupStatus, CspStatusCode } from '../../../common/types';
import {
  getAgentStatusesByAgentPolicies,
  getCspAgentPolicies,
  getCspPackagePolicies,
} from '../../lib/fleet_util';
import { checkForFindings } from '../../lib/check_for_findings';

export const INDEX_TIMEOUT_IN_MINUTES = 10;

const calculateDiffFromNowInMinutes = (date: string | number): number =>
  moment().diff(moment(date), 'minutes');

const getHealthyAgents = async (
  soClient: SavedObjectsClientContract,
  installedCspPackagePolicies: PackagePolicy[],
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
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
    agentPolicies
  );

  return Object.values(agentStatusesByAgentPolicyId).reduce(
    (sum, status) => sum + status.online + status.updating,
    0
  );
};

const calculateCspStatusCode = (
  hasFindings: boolean,
  installedCspPackagePolicies: number,
  healthyAgents: number,
  timeSinceInstallationInMinutes: number
): CspStatusCode => {
  if (hasFindings) return 'indexed';
  if (installedCspPackagePolicies === 0) return 'not-installed';
  if (healthyAgents === 0) return 'not-deployed';
  if (timeSinceInstallationInMinutes <= INDEX_TIMEOUT_IN_MINUTES) return 'indexing';
  if (timeSinceInstallationInMinutes > INDEX_TIMEOUT_IN_MINUTES) return 'index-timeout';

  throw new Error('Could not determine csp status');
};

const getCspStatus = async ({
  logger,
  esClient,
  soClient,
  packageService,
  packagePolicyService,
  agentPolicyService,
  agentService,
}: CspApiRequestHandlerContext): Promise<CspSetupStatus> => {
  const [hasFindings, installation, latestCspPackage, installedPackagePolicies] = await Promise.all(
    [
      checkForFindings(esClient.asCurrentUser, true, logger),
      packageService.asInternalUser.getInstallation(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      packageService.asInternalUser.fetchFindLatestPackage(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      getCspPackagePolicies(soClient, packagePolicyService, CLOUD_SECURITY_POSTURE_PACKAGE_NAME, {
        per_page: 10000,
      }),
    ]
  );

  const healthyAgents = await getHealthyAgents(
    soClient,
    installedPackagePolicies.items,
    agentPolicyService,
    agentService
  );

  const installedPackagePoliciesTotal = installedPackagePolicies.total;
  const latestCspPackageVersion = latestCspPackage.version;

  const MIN_DATE = 0;
  const status = calculateCspStatusCode(
    hasFindings,
    installedPackagePoliciesTotal,
    healthyAgents,
    calculateDiffFromNowInMinutes(installation?.install_started_at || MIN_DATE)
  );

  if (status === 'not-installed')
    return {
      status,
      latestPackageVersion: latestCspPackageVersion,
      healthyAgents,
      installedPackagePolicies: installedPackagePoliciesTotal,
    };

  return {
    status,
    latestPackageVersion: latestCspPackageVersion,
    healthyAgents,
    installedPackagePolicies: installedPackagePoliciesTotal,
    installedPackageVersion: installation?.install_version,
  };
};

export const defineGetCspStatusRoute = (router: CspRouter): void =>
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
