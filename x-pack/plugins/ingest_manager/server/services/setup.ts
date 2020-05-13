/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import uuid from 'uuid';
import { SavedObjectsClientContract } from 'src/core/server';
import { CallESAsCurrentUser } from '../types';
import { agentConfigService } from './agent_config';
import { outputService } from './output';
import { ensureInstalledDefaultPackages } from './epm/packages/install';
import { ensureDefaultIndices } from './epm/kibana/index_pattern/install';
import {
  packageToConfigDatasource,
  Datasource,
  AgentConfig,
  Installation,
  Output,
  DEFAULT_AGENT_CONFIGS_PACKAGES,
  decodeCloudId,
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
  const start = Date.now();
  let last = start;
  console.log(new Date(start), 'setup start');
  const [installedPackages, defaultOutput, config] = await Promise.all([
    // packages installed by default
    console.log(new Date(), 'start ensureInstalledDefaultPackages') ||
      ensureInstalledDefaultPackages(soClient, callCluster).then(
        value =>
          console.log(new Date(), 'end ensureInstalledDefaultPackages', Date.now() - start) || value
      ),
    console.log(new Date(), 'start outputService.ensureDefaultOutput') ||
      outputService
        .ensureDefaultOutput(soClient)
        .then(
          value =>
            console.log(new Date(), 'end outputService.ensureDefaultOutput', Date.now() - start) ||
            value
        ),
    console.log(new Date(), 'start agentConfigService.ensureDefaultAgentConfig') ||
      agentConfigService
        .ensureDefaultAgentConfig(soClient)
        .then(
          value =>
            console.log(
              new Date(),
              'end agentConfigService.ensureDefaultAgentConfig',
              Date.now() - start
            ) || value
        ),
    console.log(new Date(), 'start ensureDefaultIndices') ||
      ensureDefaultIndices(callCluster).then(
        value => console.log(new Date(), 'end ensureDefaultIndices', Date.now() - start) || value
      ),
    console.log(new Date(), 'start settingsService.getSettings') ||
      settingsService
        .getSettings(soClient)
        .then(
          value =>
            console.log(new Date(), 'end settingsService.getSettings', Date.now() - start) || value
        )
        .catch((e: any) => {
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
              hostname: serverInfo.host,
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
  console.log(new Date(), 'setup A', Date.now() - last, (last = Date.now()) - start);
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
  console.log(new Date(), 'setup B', Date.now() - last, (last = Date.now()) - start);
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
  console.log(new Date(), 'setup C', Date.now() - last, (last = Date.now()) - start);
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
  const defaultOutputId = await outputService.getDefaultOutputId(soClient);
  if (!defaultOutputId) {
    throw new Error('Default output does not exist');
  }

  await outputService.updateOutput(soClient, defaultOutputId, {
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
