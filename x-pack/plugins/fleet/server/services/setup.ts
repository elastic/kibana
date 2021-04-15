/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';

import { DEFAULT_AGENT_POLICIES_PACKAGES, FLEET_SERVER_PACKAGE } from '../../common';

import type { PackagePolicy } from '../../common';

import { SO_SEARCH_LIMIT } from '../constants';

import { appContextService } from './app_context';
import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';
import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';
import { outputService } from './output';
import {
  ensureInstalledDefaultPackages,
  ensureInstalledPackage,
  ensurePackagesCompletedInstall,
} from './epm/packages/install';
import { generateEnrollmentAPIKey, hasEnrollementAPIKeysForPolicy } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { createDefaultSettings } from './settings';
import { ensureAgentActionPolicyChangeExists } from './agents';
import { awaitIfFleetServerSetupPending } from './fleet_server';

const FLEET_ENROLL_USERNAME = 'fleet_enroll';
const FLEET_ENROLL_ROLE = 'fleet_enroll';

export interface SetupStatus {
  isInitialized: boolean;
  preconfigurationError: { name: string; message: string } | undefined;
}

export async function setupIngestManager(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  return awaitIfPending(async () => createSetupSideEffects(soClient, esClient));
}

async function createSetupSideEffects(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  const [installedPackages, defaultOutput] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, esClient),
    outputService.ensureDefaultOutput(soClient),
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
  await ensurePackagesCompletedInstall(soClient, esClient);

  await awaitIfFleetServerSetupPending();

  const fleetServerPackage = await ensureInstalledPackage({
    savedObjectsClient: soClient,
    pkgName: FLEET_SERVER_PACKAGE,
    esClient,
  });

  const { agentPolicies: policiesOrUndefined, packages: packagesOrUndefined } =
    appContextService.getConfig() ?? {};

  const policies = policiesOrUndefined ?? [];
  const packages = packagesOrUndefined ?? [];
  let preconfigurationError;

  try {
    await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      policies,
      packages,
      defaultOutput
    );
  } catch (e) {
    preconfigurationError = { name: e.name, message: e.message };
  }

  // Ensure the predefined default policies AFTER loading preconfigured policies. This allows the kibana config
  // to override the default agent policies.

  const [
    { created: defaultAgentPolicyCreated, policy: defaultAgentPolicy },
    { created: defaultFleetServerPolicyCreated, policy: defaultFleetServerPolicy },
  ] = await Promise.all([
    agentPolicyService.ensureDefaultAgentPolicy(soClient, esClient),
    agentPolicyService.ensureDefaultFleetServerAgentPolicy(soClient, esClient),
  ]);

  // If we just created the default fleet server policy add the fleet server package
  if (defaultFleetServerPolicyCreated) {
    await addPackageToAgentPolicy(
      soClient,
      esClient,
      fleetServerPackage,
      defaultFleetServerPolicy,
      defaultOutput
    );
  }

  // If we just created the default policy, ensure default packages are added to it
  if (defaultAgentPolicyCreated) {
    const agentPolicyWithPackagePolicies = await agentPolicyService.get(
      soClient,
      defaultAgentPolicy.id,
      true
    );
    if (!agentPolicyWithPackagePolicies) {
      throw new Error(
        i18n.translate('xpack.fleet.setup.policyNotFoundError', {
          defaultMessage: 'Policy not found',
        })
      );
    }
    if (
      agentPolicyWithPackagePolicies.package_policies.length &&
      typeof agentPolicyWithPackagePolicies.package_policies[0] === 'string'
    ) {
      throw new Error(
        i18n.translate('xpack.fleet.setup.policyNotFoundError', {
          defaultMessage: 'Policy not found',
        })
      );
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
          esClient,
          installedPackage,
          agentPolicyWithPackagePolicies,
          defaultOutput
        );
      }
    }
  }

  await ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);

  await ensureAgentActionPolicyChangeExists(soClient, esClient);

  return { isInitialized: true, preconfigurationError };
}

export async function ensureDefaultEnrollmentAPIKeysExists(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options?: { forceRecreate?: boolean }
) {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    return;
  }

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map(async (agentPolicy) => {
      const hasKey = await hasEnrollementAPIKeysForPolicy(esClient, agentPolicy.id);

      if (hasKey) {
        return;
      }

      return generateEnrollmentAPIKey(soClient, esClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
        forceRecreate: true, // Always generate a new enrollment key when Fleet is being set up
      });
    })
  );
}

async function putFleetRole(esClient: ElasticsearchClient) {
  return await esClient.security.putRole({
    name: FLEET_ENROLL_ROLE,
    body: {
      cluster: ['monitor', 'manage_api_key'],
      indices: [
        {
          names: ['logs-*', 'metrics-*', 'traces-*', '.logs-endpoint.diagnostic.collection-*'],
          privileges: ['auto_configure', 'create_doc'],
        },
      ],
    },
  });
}

// TODO Deprecated should be removed as part of https://github.com/elastic/kibana/issues/94303
export async function setupFleet(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options?: { forceRecreate?: boolean }
) {
  // Create fleet_enroll role
  // This should be done directly in ES at some point
  const { body: res } = await putFleetRole(esClient);

  // If the role is already created skip the rest unless you have forceRecreate set to true
  if (options?.forceRecreate !== true && res.role.created === false) {
    return;
  }
  const password = generateRandomPassword();
  // Create fleet enroll user
  await esClient.security.putUser({
    username: FLEET_ENROLL_USERNAME,
    body: {
      password,
      roles: [FLEET_ENROLL_ROLE],
      metadata: {
        updated_at: new Date().toISOString(),
      },
    },
  });

  // save fleet admin user
  const defaultOutputId = await outputService.getDefaultOutputId(soClient);
  if (!defaultOutputId) {
    throw new Error(
      i18n.translate('xpack.fleet.setup.defaultOutputError', {
        defaultMessage: 'Default output does not exist',
      })
    );
  }
  await outputService.updateOutput(soClient, defaultOutputId, {
    fleet_enroll_username: FLEET_ENROLL_USERNAME,
    fleet_enroll_password: password,
  });

  outputService.invalidateCache();
}

function generateRandomPassword() {
  return Buffer.from(uuid.v4()).toString('base64');
}
