/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';

import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
} from '../../common';

import type { AgentPolicy, NewAgentPolicy } from '../types';

import { agentPolicyService, packagePolicyService } from '.';
import { incrementPackageName } from './package_policies';
import { bulkInstallPackages } from './epm/packages';
import { ensureDefaultEnrollmentAPIKeysExists } from './setup';

const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

async function getFleetServerAgentPolicyId(
  soClient: SavedObjectsClientContract
): Promise<string | undefined> {
  let agentPolicyId;
  // creating first fleet server policy with id 'fleet-server-policy'
  let agentPolicy;
  try {
    agentPolicy = await agentPolicyService.get(soClient, FLEET_SERVER_POLICY_ID, false);
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }
  if (!agentPolicy) {
    agentPolicyId = FLEET_SERVER_POLICY_ID;
  }
  return agentPolicyId;
}

async function createPackagePolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  packageToInstall: string,
  options: { spaceId: string; user: AuthenticatedUser | undefined }
) {
  const newPackagePolicy = await packagePolicyService
    .buildPackagePolicyFromPackage(soClient, packageToInstall)
    .catch(async (error) => {
      // rollback agent policy on error
      await agentPolicyService.delete(soClient, esClient, agentPolicy.id, {
        force: true,
      });
      throw error;
    });

  if (!newPackagePolicy) return;

  newPackagePolicy.policy_id = agentPolicy.id;
  newPackagePolicy.namespace = agentPolicy.namespace;
  newPackagePolicy.name = await incrementPackageName(soClient, packageToInstall);

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    spaceId: options.spaceId,
    user: options.user,
    bumpRevision: false,
  });
}

interface CreateAgentPolicyParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  newPolicy: NewAgentPolicy;
  hasFleetServer?: boolean;
  withSysMonitoring: boolean;
  monitoringEnabled?: string[];
  spaceId: string;
  user?: AuthenticatedUser;
}

export async function createAgentPolicyWithPackages({
  soClient,
  esClient,
  newPolicy,
  hasFleetServer,
  withSysMonitoring,
  monitoringEnabled,
  spaceId,
  user,
}: CreateAgentPolicyParams) {
  let agentPolicyId = newPolicy.id;
  const packagesToInstall = [];
  if (hasFleetServer) {
    packagesToInstall.push(FLEET_SERVER_PACKAGE);

    agentPolicyId = agentPolicyId || (await getFleetServerAgentPolicyId(soClient));
    if (agentPolicyId === FLEET_SERVER_POLICY_ID) {
      // setting first fleet server policy to default, so that fleet server can enroll without setting policy_id
      newPolicy.is_default_fleet_server = true;
    }
  }
  if (withSysMonitoring) {
    packagesToInstall.push(FLEET_SYSTEM_PACKAGE);
  }
  if (monitoringEnabled?.length) {
    packagesToInstall.push(FLEET_ELASTIC_AGENT_PACKAGE);
  }
  if (packagesToInstall.length > 0) {
    await bulkInstallPackages({
      savedObjectsClient: soClient,
      esClient,
      packagesToInstall,
      spaceId,
    });
  }

  const { id, ...policy } = newPolicy; // omit id from create object

  const agentPolicy = await agentPolicyService.create(soClient, esClient, policy, {
    user,
    id: agentPolicyId,
  });

  // Create the fleet server package policy and add it to agent policy.
  if (hasFleetServer) {
    await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SERVER_PACKAGE, {
      spaceId,
      user,
    });
  }

  // Create the system monitoring package policy and add it to agent policy.
  if (withSysMonitoring) {
    await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SYSTEM_PACKAGE, {
      spaceId,
      user,
    });
  }

  await ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);
  await agentPolicyService.deployPolicy(soClient, agentPolicy.id);

  return agentPolicy;
}
