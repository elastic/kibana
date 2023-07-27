/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DefaultResourceInstaller, ResourceInstaller } from './resource_installer';
import {
  DefaultSummaryTransformInstaller,
  SummaryTransformInstaller,
} from './summary_transform/summary_transform_installer';

export interface SLOInstaller {
  install(): Promise<void>;
}

export class DefaultSLOInstaller implements SLOInstaller {
  private sloResourceInstaller: ResourceInstaller;
  private sloSummaryInstaller: SummaryTransformInstaller;
  private isInstalling: boolean = false;

  constructor(esInternalClient: ElasticsearchClient, private logger: Logger) {
    this.sloResourceInstaller = new DefaultResourceInstaller(esInternalClient, logger);
    this.sloSummaryInstaller = new DefaultSummaryTransformInstaller(esInternalClient, logger);
  }

  public async install() {
    if (this.isInstalling) {
      return;
    }
    this.isInstalling = true;

    let installTimeout;
    try {
      installTimeout = setTimeout(() => (this.isInstalling = false), 60000);

      await this.sloResourceInstaller.ensureCommonResourcesInstalled();
      await this.sloSummaryInstaller.installAndStart();
    } catch (error) {
      this.logger.error('Failed to install SLO common resources and summary transforms', {
        error,
      });
      throw error;
    } finally {
      this.isInstalling = false;
      clearTimeout(installTimeout);
    }
  }
}
