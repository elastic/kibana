/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { SavedObjectsClientContract } from 'src/core/server';
import { CallESAsCurrentUser } from '../types';
import { agentConfigService } from './agent_config';
import { outputService } from './output';
import { ensureInstalledDefaultPackages } from './epm/packages/install';
import {
  packageToConfigDatasource,
  Datasource,
  AgentConfig,
  Installation,
  Output,
  DEFAULT_AGENT_CONFIGS_PACKAGES,
} from '../../common';
import { getPackageInfo } from './epm/packages';
import { datasourceService } from './datasource';
import { generateEnrollmentAPIKey } from './api_keys';
import { settingsService } from '.';
import { appContextService } from './app_context';

const FLEET_ENROLL_USERNAME = 'fleet_enroll';
const FLEET_ENROLL_ROLE = 'fleet_enroll';

export async function setupIngestManager(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const [installedPackages, defaultOutput, config] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, callCluster),
    outputService.ensureDefaultOutput(soClient),
    agentConfigService.ensureDefaultAgentConfig(soClient),
    settingsService.getSettings(soClient).catch((e: any) => {
      if (e.isBoom && e.output.statusCode === 404) {
        return settingsService.saveSettings(soClient, {
          agent_auto_upgrade: true,
          package_auto_upgrade: true,
          kibana_url: appContextService.getConfig()?.fleet?.kibana?.host,
        });
      }

      return Promise.reject(e);
    }),
  ]);

  // ensure default packages are added to the default conifg
  const configWithDatasource = await agentConfigService.get(soClient, config.id, true);
  if (!configWithDatasource) {
    throw new Error('Config not found');
  }
  if (
    configWithDatasource.datasources.length &&
    typeof configWithDatasource.datasources[0] === 'string'
  ) {
    throw new Error('Config not found');
  }
  for (const installedPackage of installedPackages) {
    const packageShouldBeInstalled = DEFAULT_AGENT_CONFIGS_PACKAGES.some(
      packageName => installedPackage.name === packageName
    );
    if (!packageShouldBeInstalled) {
      continue;
    }

    const isInstalled = configWithDatasource.datasources.some((d: Datasource | string) => {
      return typeof d !== 'string' && d.package?.name === installedPackage.name;
    });

    if (!isInstalled) {
      await addPackageToConfig(soClient, installedPackage, configWithDatasource, defaultOutput);
    }
  }
}

export async function setupFleet(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  // Create fleet_enroll role
  // This should be done directly in ES at some point
  await callCluster('transport.request', {
    method: 'PUT',
    path: `/_security/role/${FLEET_ENROLL_ROLE}`,
    body: {
      cluster: ['monitor', 'manage_api_key'],
      indices: [
        {
          names: ['logs-*', 'metrics-*', 'events-*'],
          privileges: ['write', 'create_index'],
        },
      ],
    },
  });
  const password = generateRandomPassword();
  // Create fleet enroll user
  await callCluster('transport.request', {
    method: 'PUT',
    path: `/_security/user/${FLEET_ENROLL_USERNAME}`,
    body: {
      password,
      roles: [FLEET_ENROLL_ROLE],
    },
  });

  // save fleet admin user
  await outputService.updateOutput(soClient, await outputService.getDefaultOutputId(soClient), {
    fleet_enroll_username: FLEET_ENROLL_USERNAME,
    fleet_enroll_password: password,
  });

  // Generate default enrollment key
  await generateEnrollmentAPIKey(soClient, {
    name: 'Default',
    configId: await agentConfigService.getDefaultAgentConfigId(soClient),
  });
}

function generateRandomPassword() {
  return Buffer.from(uuid.v4()).toString('base64');
}

async function addPackageToConfig(
  soClient: SavedObjectsClientContract,
  packageToInstall: Installation,
  config: AgentConfig,
  defaultOutput: Output
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: packageToInstall.name,
    pkgVersion: packageToInstall.version,
  });

  const newDatasource = packageToConfigDatasource(
    packageInfo,
    config.id,
    defaultOutput.id,
    undefined,
    config.namespace
  );
  newDatasource.inputs = await datasourceService.assignPackageStream(
    packageInfo,
    newDatasource.inputs
  );

  await datasourceService.create(soClient, newDatasource);
}
