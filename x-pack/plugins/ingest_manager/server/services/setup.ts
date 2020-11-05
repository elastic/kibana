/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
} from '../../common';
import { SO_SEARCH_LIMIT } from '../constants';
import { getPackageInfo } from './epm/packages';
import { packagePolicyService } from './package_policy';
import { generateEnrollmentAPIKey } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { createDefaultSettings } from './settings';
import { ensureAgentActionPolicyChangeExists } from './agents';

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
  const [
    installedPackages,
    defaultOutput,
    { created: defaultAgentPolicyCreated, defaultAgentPolicy },
  ] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, callCluster),
    outputService.ensureDefaultOutput(soClient),
    agentPolicyService.ensureDefaultAgentPolicy(soClient),
    ensureDefaultIndices(callCluster),
    settingsService.getSettings(soClient).catch((e: any) => {
      if (e.isBoom && e.output.statusCode === 404) {
        const defaultSettings = createDefaultSettings();
        return settingsService.saveSettings(soClient, defaultSettings);
      }

      return Promise.reject(e);
    }),
  ]);

  // Keeping this outside of the Promise.all because it introduces a race condition.
  // If one of the required packages fails to install/upgrade it might get stuck in the installing state.
  // On the next call to the /setup API, if there is a upgrade available for one of the required packages a race condition
  // will occur between upgrading the package and reinstalling the previously failed package.
  // By moving this outside of the Promise.all, the upgrade will occur first, and then we'll attempt to reinstall any
  // packages that are stuck in the installing state.
  await ensurePackagesCompletedInstall(soClient, callCluster);

  // If we just created the default policy, ensure default packages are added to it
  if (defaultAgentPolicyCreated) {
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
  }

  await ensureAgentActionPolicyChangeExists(soClient);

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
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map((agentPolicy) => {
      return generateEnrollmentAPIKey(soClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
      });
    })
  );

  await Promise.all(
    agentPolicies.map((agentPolicy) =>
      agentPolicyService.createFleetPolicyChangeAction(soClient, agentPolicy.id)
    )
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
