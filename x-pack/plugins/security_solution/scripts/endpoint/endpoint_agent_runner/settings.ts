/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import execa from 'execa';
import { SettingsStorage } from '../common/settings_storage';

export class EndpointAgentRunnerSettings extends SettingsStorage {
  constructor() {
    super('settings.json', {
      directory: path.join(SettingsStorage.getDefaultDirectoryPath(), 'endpoint_agent_runner'),
    });
  }

  async setup(): Promise<void> {
    await this.ensureExists();

    const vmConfigDir = path.resolve(__dirname, 'vm_config');

    // Copy certain files to the settings folder
    const files: Array<{ from: string; to: string; permissions?: number }> = [
      {
        from: path.join(vmConfigDir, 'multipass_ssh_key'),
        to: path.join(this.getDirectoryPath(), 'multipass_ssh_key'),
        permissions: 600,
      },
    ];

    for (const file of files) {
      if (!existsSync(file.to)) {
        await copyFile(file.from, file.to);

        if (process.platform !== 'win32' && file.permissions) {
          execa.command(`chmod ${file.permissions} ${file.to}`);
        }
      }
    }
  }
}
