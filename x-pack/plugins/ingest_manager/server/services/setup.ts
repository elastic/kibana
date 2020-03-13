/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { CallESAsCurrentUser } from '../types';
import { agentConfigService } from './agent_config';
import { outputService } from './output';
import { ensureInstalledDefaultPackages } from './epm/packages/install';
import {
  packageToConfigDatasourceInputs,
  Datasource,
  AgentConfig,
  Installation,
  Output,
  DEFAULT_AGENT_CONFIGS_PACKAGES,
} from '../../common';
import { getPackageInfo } from './epm/packages';
import { datasourceService } from './datasource';

export async function setup(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const [installedPackages, defaultOutput, config] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, callCluster),
    outputService.ensureDefaultOutput(soClient),
    agentConfigService.ensureDefaultAgentConfig(soClient),
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

async function addPackageToConfig(
  soClient: SavedObjectsClientContract,
  packageToInstall: Installation,
  config: AgentConfig,
  defaultOutput: Output
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgkey: `${packageToInstall.name}-${packageToInstall.version}`,
  });
  await datasourceService.create(soClient, {
    name: `${packageInfo.name}-1`,
    enabled: true,
    package: {
      name: packageInfo.name,
      title: packageInfo.title,
      version: packageInfo.version,
    },
    inputs: packageToConfigDatasourceInputs(packageInfo),
    config_id: config.id,
    output_id: defaultOutput.id,
  });
}
