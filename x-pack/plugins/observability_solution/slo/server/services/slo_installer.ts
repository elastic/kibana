/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ResourceInstaller } from '.';

export interface SLOInstaller {
  install(): Promise<void>;
}

export class DefaultSLOInstaller implements SLOInstaller {
  private isInstalling: boolean = false;

  constructor(private sloResourceInstaller: ResourceInstaller, private logger: Logger) {}

  public async install() {
    if (this.isInstalling) {
      return;
    }
    this.isInstalling = true;

    let installTimeout;
    try {
      installTimeout = setTimeout(() => (this.isInstalling = false), 60000);

      await this.sloResourceInstaller.ensureCommonResourcesInstalled();
    } catch (error) {
      this.logger.error('Failed to install SLO common resources');
    } finally {
      this.isInstalling = false;
      clearTimeout(installTimeout);
    }
  }
}
