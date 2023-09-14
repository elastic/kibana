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
import type { CloudDefendInstallationStats } from './types';
import type { CloudDefendPluginStart, CloudDefendPluginStartDeps } from '../../../types';
import { INTEGRATION_PACKAGE_NAME, INPUT_CONTROL } from '../../../../common/constants';
import {
  getInputFromPolicy,
  getSelectorsAndResponsesFromYaml,
} from '../../../../common/utils/helpers';

export const getInstallationStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  coreServices: Promise<[CoreStart, CloudDefendPluginStartDeps, CloudDefendPluginStart]>,
  logger: Logger
): Promise<CloudDefendInstallationStats[]> => {
  const [, cloudDefendServerPluginStartDeps] = await coreServices;

  const cloudDefendContext = {
    logger,
    esClient,
    soClient,
    agentPolicyService: cloudDefendServerPluginStartDeps.fleet.agentPolicyService,
    packagePolicyService: cloudDefendServerPluginStartDeps.fleet.packagePolicyService,
  };

  const getInstalledPackagePolicies = async (
    packagePolicies: PackagePolicy[],
    agentPolicies: AgentPolicy[]
  ) => {
    const installationStats = packagePolicies.map(
      (packagePolicy: PackagePolicy): CloudDefendInstallationStats => {
        const agentCounts =
          agentPolicies?.find((agentPolicy) => agentPolicy?.id === packagePolicy.policy_id)
            ?.agents ?? 0;

        const input = getInputFromPolicy(packagePolicy, INPUT_CONTROL);
        const policyYaml = input?.vars?.configuration?.value;
        const { selectors, responses } = getSelectorsAndResponsesFromYaml(policyYaml);

        return {
          package_policy_id: packagePolicy.id,
          package_version: packagePolicy.package?.version as string,
          created_at: packagePolicy.created_at,
          agent_policy_id: packagePolicy.policy_id,
          agent_count: agentCounts,
          policy_yaml: policyYaml,
          selectors,
          responses,
        };
      }
    );
    return installationStats;
  };

  const packagePolicies = await cloudDefendContext.packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${INTEGRATION_PACKAGE_NAME}"`,
  });

  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: '',
    esClient,
    withAgentCount: true,
  });

  if (!packagePolicies) return [];

  const installationStats: CloudDefendInstallationStats[] = await getInstalledPackagePolicies(
    packagePolicies.items,
    agentPolicies?.items || []
  );

  return installationStats;
};
