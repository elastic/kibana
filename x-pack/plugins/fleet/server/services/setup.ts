/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';

import {
  packageToPackagePolicy,
  DEFAULT_AGENT_POLICIES_PACKAGES,
  FLEET_SERVER_PACKAGE,
} from '../../common';

import type { PackagePolicy, AgentPolicy, Installation, Output } from '../../common';

import { SO_SEARCH_LIMIT } from '../constants';

import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import { outputService } from './output';
import {
  ensureInstalledDefaultPackages,
  ensureInstalledPackage,
  ensurePackagesCompletedInstall,
} from './epm/packages/install';
import { getPackageInfo } from './epm/packages';
import { packagePolicyService } from './package_policy';
import { generateEnrollmentAPIKey } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { createDefaultSettings } from './settings';
import { ensureAgentActionPolicyChangeExists } from './agents';
import { awaitIfFleetServerSetupPending } from './fleet_server';

const FLEET_ENROLL_USERNAME = 'fleet_enroll';
const FLEET_ENROLL_ROLE = 'fleet_enroll';

export interface SetupStatus {
  isIntialized: true | undefined;
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
  const { policiesPromise, packagesPromise } = ensurePreconfiguredPackagesAndPolicies(
    soClient,
    esClient
  );

  const [
    installedPackages,
    defaultOutput,
    { created: defaultAgentPolicyCreated, policy: defaultAgentPolicy },
    { created: defaultFleetServerPolicyCreated, policy: defaultFleetServerPolicy },
    preconfiguredPolicies,
  ] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, esClient),
    outputService.ensureDefaultOutput(soClient),
    agentPolicyService.ensureDefaultAgentPolicy(soClient, esClient),
    agentPolicyService.ensureDefaultFleetServerAgentPolicy(soClient, esClient),
    policiesPromise,
    packagesPromise,
    updateFleetRoleIfExists(esClient),
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

  if (defaultFleetServerPolicyCreated) {
    await addPackageToAgentPolicy(
      soClient,
      esClient,
      fleetServerPackage,
      defaultFleetServerPolicy,
      defaultOutput
    );
  }

  // If we just created the default fleet server policy add the fleet server package

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

  for (const preconfiguredPolicy of preconfiguredPolicies) {
    const { created, policy, integrations } = preconfiguredPolicy;
    if (created) {
      await addPreconfiguredPolicyPackages(soClient, esClient, policy, integrations, defaultOutput);
    }
  }

  await ensureAgentActionPolicyChangeExists(soClient);

  return { isIntialized: true };
}

function ensurePreconfiguredPackagesAndPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const { policies: policiesOrUndefined, packages: packagesOrUndefined } =
    appContextService.getConfig() ?? {};

  const policies = policiesOrUndefined ?? [];
  const packages = packagesOrUndefined ?? [];

  // Validate configured packages to ensure there are no version conflicts
  const packageNamesByVersion = groupBy(
    packages,
    (packageString: string) => packageString.split(':')[0]
  );
  const duplicatePackages = Object.entries(packageNamesByVersion).filter(
    ([, versions]) => versions.length > 1
  );
  if (duplicatePackages.length) {
    const duplicateList = duplicatePackages.map(([, versions]) => versions.join(', ')).join('; ');

    throw new Error(
      i18n.translate('xpack.fleet.setup.duplicatePackageError', {
        defaultMessage: 'Duplicate packages specified in configuration: {duplicateList}',
        values: {
          duplicateList,
        },
      })
    );
  }

  // Create policies specified in Kibana config
  const policiesPromise = Promise.all(
    policies.map(async ({ integrations, id, ...newAgentPolicy }) => {
      const { created, policy } = await agentPolicyService.ensurePreconfiguredAgentPolicy(
        soClient,
        esClient,
        { ...newAgentPolicy, preconfiguration_id: String(id) }
      );
      return { created, policy, integrations };
    })
  );

  // Preinstall packages specified in Kibana config
  const packagesPromise = Promise.all(
    packages.map((packageString) =>
      ensureInstalledPreconfiguredPackage(soClient, esClient, packageString)
    )
  );

  return { policiesPromise, packagesPromise };
}

async function addPreconfiguredPolicyPackages(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  integrations: Array<{ package: string; name: string }>,
  defaultOutput: Output
) {
  return await Promise.all(
    integrations.map(async ({ package: packageString, name }) => {
      const installedPackage = await ensureInstalledPreconfiguredPackage(
        soClient,
        esClient,
        packageString
      );
      return addPackageToAgentPolicy(
        soClient,
        esClient,
        installedPackage,
        agentPolicy,
        defaultOutput,
        name
      );
    })
  );
}

async function ensureInstalledPreconfiguredPackage(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packageString: string
) {
  const [pkgName, version] = packageString.split(':');
  return ensureInstalledPackage({
    savedObjectsClient: soClient,
    pkgName,
    esClient,
    version,
  });
}

async function updateFleetRoleIfExists(esClient: ElasticsearchClient) {
  try {
    await esClient.security.getRole({ name: FLEET_ENROLL_ROLE });
  } catch (e) {
    if (e.statusCode === 404) {
      return;
    }

    throw e;
  }

  return putFleetRole(esClient);
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

  outputService.invalidateCache();

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

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map((agentPolicy) => {
      return generateEnrollmentAPIKey(soClient, esClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
        forceRecreate: true, // Always generate a new enrollment key when Fleet is being set up
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
  esClient: ElasticsearchClient,
  packageToInstall: Installation,
  agentPolicy: AgentPolicy,
  defaultOutput: Output,
  packagePolicyName?: string
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
    agentPolicy.namespace,
    packagePolicyName
  );

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    bumpRevision: false,
  });
}
