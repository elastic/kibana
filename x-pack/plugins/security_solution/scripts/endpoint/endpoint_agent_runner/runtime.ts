/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import path from 'path';
import { copyFile, mkdir } from 'fs/promises';
import execa from 'execa';
import { existsSync } from 'fs';
import { SettingsStorage } from '../common/settings_storage';
import { getAgentVersionMatchingCurrentStack } from '../common/fleet_services';
import type { StartRuntimeServicesOptions } from './types';
import type { RuntimeServices } from '../common/stack_services';
import { createRuntimeServices } from '../common/stack_services';

interface EndpointRunnerRuntimeServices extends RuntimeServices {
  options: Omit<
    StartRuntimeServicesOptions,
    'kibanaUrl' | 'elasticUrl' | 'username' | 'password' | 'log'
  >;
  localSettingsDirPath: string;
}

// Internal singleton storing the services for the current run
let runtimeServices: undefined | EndpointRunnerRuntimeServices;

export const startRuntimeServices = async ({
  log = new ToolingLog(),
  elasticUrl,
  kibanaUrl,
  username,
  password,
  ...otherOptions
}: StartRuntimeServicesOptions) => {
  const stackServices = await createRuntimeServices({
    kibanaUrl,
    elasticsearchUrl: elasticUrl,
    username,
    password,
    log,
  });

  runtimeServices = {
    ...stackServices,
    options: {
      ...otherOptions,

      version:
        otherOptions.version ||
        (await getAgentVersionMatchingCurrentStack(stackServices.kbnClient)),
    },
    localSettingsDirPath: path.join(
      SettingsStorage.getDefaultDirectoryPath(),
      'endpoint_agent_runner'
    ),
  };

  await setupLocalFiles(runtimeServices.localSettingsDirPath);
};

export const stopRuntimeServices = async () => {
  runtimeServices = undefined;
};

export const getRuntimeServices = () => {
  if (!runtimeServices) {
    throw new Error(`Runtime services have not be initialized yet!`);
  }

  return runtimeServices;
};

const setupLocalFiles = async (localSettingsDir: string) => {
  const vmConfigDir = path.resolve(__dirname, 'vm_config');

  await mkdir(localSettingsDir, { recursive: true });

  const localhostSshKeyFilePath = path.join(localSettingsDir, 'multipass_ssh_key');

  if (!existsSync(localhostSshKeyFilePath)) {
    await copyFile(path.join(vmConfigDir, 'multipass_ssh_key'), localhostSshKeyFilePath);

    if (process.platform !== 'win32') {
      execa.command(`chmod 600 multipass_ssh_key`, { cwd: localSettingsDir });
    }
  }
};
