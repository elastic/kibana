/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import uuid from 'uuid';
import { SavedObjectsClientContract } from 'src/core/server';
import { CallESAsCurrentUser } from '../types';
import { agentPolicyService } from './agent_policy';
import { outputService } from './output';
import {
  ensureInstalledDefaultPackages,
  ensurePackagesCompletedInstall,
} from './epm/packages/install';
import { ensureDefaultIndices } from './epm/kibana/index_pattern/install';
import {
  packageToPackagePolicy,
  PackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  DEFAULT_AGENT_POLICIES_PACKAGES,
  decodeCloudId,
} from '../../common';
import { getPackageInfo } from './epm/packages';
import { packagePolicyService } from './package_policy';
import { generateEnrollmentAPIKey } from './api_keys';
import { settingsService } from '.';
import { appContextService } from './app_context';
import { awaitIfPending } from './setup_utils';

const FLEET_ENROLL_USERNAME = 'fleet_enroll';
const FLEET_ENROLL_ROLE = 'fleet_enroll';

export interface SetupStatus {
  isIntialized: true | undefined;
}

export async function setupIngestManager(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<SetupStatus> {
  return awaitIfPending(async () => createSetupSideEffects(soClient, callCluster));
}

async function createSetupSideEffects(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<SetupStatus> {
  const [installedPackages, defaultOutput, defaultAgentPolicy] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, callCluster),
    outputService.ensureDefaultOutput(soClient),
    agentPolicyService.ensureDefaultAgentPolicy(soClient),
    ensurePackagesCompletedInstall(soClient, callCluster),
    ensureDefaultIndices(callCluster),
    settingsService.getSettings(soClient).catch((e: any) => {
      if (e.isBoom && e.output.statusCode === 404) {
        const http = appContextService.getHttpSetup();
        const serverInfo = http.getServerInfo();
        const basePath = http.basePath;

        const cloud = appContextService.getCloud();
        const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
        const cloudUrl = cloudId && decodeCloudId(cloudId)?.kibanaUrl;
        const flagsUrl = appContextService.getConfig()?.fleet?.kibana?.host;
        const defaultUrl = url.format({
          protocol: serverInfo.protocol,
          hostname: serverInfo.hostname,
          port: serverInfo.port,
          pathname: basePath.serverBasePath,
        });

        return settingsService.saveSettings(soClient, {
          agent_auto_upgrade: true,
          package_auto_upgrade: true,
          kibana_url: cloudUrl || flagsUrl || defaultUrl,
        });
      }

      return Promise.reject(e);
    }),
  ]);

  // ensure default packages are added to the default conifg
  const agentPolicyWithPackagePolicies = await agentPolicyService.get(
    soClient,
    defaultAgentPolicy.id,
    true
  );
  if (!agentPolicyWithPackagePolicies) {
    throw new Error('Policy not found');
  }
  if (
    agentPolicyWithPackagePolicies.package_policies.length &&
    typeof agentPolicyWithPackagePolicies.package_policies[0] === 'string'
  ) {
    throw new Error('Policy not found');
  }
  for (const installedPackage of installedPackages) {
    const packageShouldBeInstalled = DEFAULT_AGENT_POLICIES_PACKAGES.some(
      (packageName) => installedPackage.name === packageName
    );
    if (!packageShouldBeInstalled) {
      continue;
    }

    const isInstalled = agentPolicyWithPackagePolicies.package_policies.some(
      (d: PackagePolicy | string) => {
        return typeof d !== 'string' && d.package?.name === installedPackage.name;
      }
    );

    if (!isInstalled) {
      await addPackageToAgentPolicy(
        soClient,
        callCluster,
        installedPackage,
        agentPolicyWithPackagePolicies,
        defaultOutput
      );
    }
  }

  return { isIntialized: true };
}

export async function setupFleet(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser,
  options?: { forceRecreate?: boolean }
) {
  // Create fleet_enroll role
  // This should be done directly in ES at some point
  const res = await callCluster('transport.request', {
    method: 'PUT',
    path: `/_security/role/${FLEET_ENROLL_ROLE}`,
    body: {
      cluster: ['monitor', 'manage_api_key'],
      indices: [
        {
          names: ['logs-*', 'metrics-*', 'events-*', '.ds-logs-*', '.ds-metrics-*', '.ds-events-*'],
          privileges: ['write', 'create_index', 'indices:admin/auto_create'],
        },
      ],
    },
  });
  // If the role is already created skip the rest unless you have forceRecreate set to true
  if (options?.forceRecreate !== true && res.role.created === false) {
    return;
  }
  const password = generateRandomPassword();
  // Create fleet enroll user
  await callCluster('transport.request', {
    method: 'PUT',
    path: `/_security/user/${FLEET_ENROLL_USERNAME}`,
    body: {
      password,
      roles: [FLEET_ENROLL_ROLE],
      metadata: {
        updated_at: new Date().toISOString(),
      },
    },
  });

  outputService.invalidateCache();

  // save fleet admin user
  const defaultOutputId = await outputService.getDefaultOutputId(soClient);
  if (!defaultOutputId) {
    throw new Error('Default output does not exist');
  }

  await outputService.updateOutput(soClient, defaultOutputId, {
    fleet_enroll_username: FLEET_ENROLL_USERNAME,
    fleet_enroll_password: password,
  });

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: 10000,
  });

  await Promise.all(
    agentPolicies.map((agentPolicy) => {
      return generateEnrollmentAPIKey(soClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
      });
    })
  );
}

function generateRandomPassword() {
  return Buffer.from(uuid.v4()).toString('base64');
}

async function addPackageToAgentPolicy(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser,
  packageToInstall: Installation,
  agentPolicy: AgentPolicy,
  defaultOutput: Output
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: packageToInstall.name,
    pkgVersion: packageToInstall.version,
  });

  const newPackagePolicy = packageToPackagePolicy(
    packageInfo,
    agentPolicy.id,
    defaultOutput.id,
    agentPolicy.namespace
  );

  await packagePolicyService.create(soClient, callCluster, newPackagePolicy, {
    bumpRevision: false,
  });
}
