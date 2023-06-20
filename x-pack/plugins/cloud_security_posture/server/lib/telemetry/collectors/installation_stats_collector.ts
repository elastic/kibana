/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  AgentPolicy,
  PackagePolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';
import { agentPolicyService } from '@kbn/fleet-plugin/server/services';
import type { CloudSecurityInstallationStats } from './types';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../../common/constants';

export const getInstallationStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
): Promise<CloudSecurityInstallationStats[]> => {
  const [, cspServerPluginStartDeps] = await coreServices;

  const cspContext = {
    logger,
    esClient,
    soClient,
    agentPolicyService: cspServerPluginStartDeps.fleet.agentPolicyService,
    packagePolicyService: cspServerPluginStartDeps.fleet.packagePolicyService,
    isPluginInitialized,
  };

  const getInstalledPackagePolicies = async (
    packagePolicies: PackagePolicy[],
    agentPolicies: AgentPolicy[]
  ) => {
    const installationStats = await packagePolicies.map(
      (packagePolicy: PackagePolicy): CloudSecurityInstallationStats => {
        const agentCounts =
          agentPolicies?.find((agentPolicy) => agentPolicy?.id === packagePolicy.policy_id)
            ?.agents ?? 0;

        return {
          package_policy_id: packagePolicy.id,
          feature: packagePolicy.vars?.posture?.value as string,
          deployment_mode: packagePolicy.vars?.deployment?.value as string,
          package_version: packagePolicy.package?.version as string,
          created_at: packagePolicy.created_at,
          agent_policy_id: packagePolicy.policy_id,
          agent_count: agentCounts,
        };
      }
    );
    return installationStats;
  };

  const packagePolicies = await cspContext.packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}"`,
  });

  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: '',
    esClient,
    withAgentCount: true,
  });
  if (!packagePolicies) return [];

  const installationStats: CloudSecurityInstallationStats[] = await getInstalledPackagePolicies(
    packagePolicies.items,
    agentPolicies?.items || []
  );

  return installationStats;
};

const isPluginInitialized = (): boolean => {
  return true;
};
