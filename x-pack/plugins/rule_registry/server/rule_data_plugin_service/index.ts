/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';

import { RuleDataClient } from '../rule_data_client';
import { IndexNames } from './index_names';
import { IndexOptions } from './index_options';
import { ResourceNames } from './resource_names';
import { ResourceInstaller, Resources } from './resource_installer';

export interface RuleDataPluginServiceConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  index: string;
}

export class RuleDataPluginService {
  private readonly resourceNames: ResourceNames;
  private readonly resourceInstaller: ResourceInstaller;
  private readonly installCommonResources: () => Promise<void>;

  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {
    this.resourceNames = new ResourceNames({ indexPrefixFromConfig: options.index });
    this.resourceInstaller = new ResourceInstaller({
      resourceNames: this.resourceNames,
      getClusterClient: options.getClusterClient,
      logger: options.logger,
      isWriteEnabled: options.isWriteEnabled,
    });

    this.installCommonResources = this.resourceInstaller.memoizeInstallation(Resources.common, () =>
      this.resourceInstaller.installResourcesSharedBetweenAllIndices()
    );
  }

  public getResourcePrefix() {
    return this.resourceNames.getFullPrefix();
  }

  public getResourceName(...relativeNameSegments: string[]) {
    return this.resourceNames.getFullName(...relativeNameSegments);
  }

  public isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  public initializeService(): void {
    this.installCommonResources().catch((e) => {
      this.options.logger.error(e);
    });
  }

  public initializeIndex(indexOptions: IndexOptions): RuleDataClient {
    const { feature, registrationContext, dataset, secondaryAlias } = indexOptions;

    const indexNames = new IndexNames({
      resourceNames: this.resourceNames,
      registrationContext,
      dataset,
      secondaryAlias: secondaryAlias ?? null,
    });

    const installIndexResources = this.resourceInstaller.memoizeInstallation(
      Resources.forIndex,
      async () => {
        await this.installCommonResources();
        await this.resourceInstaller.installResourcesSharedBetweenIndexNamespaces(
          indexOptions,
          indexNames
        );

        const clusterClient = await this.options.getClusterClient();
        return { clusterClient };
      }
    );

    // Start installation eagerly
    const installPromise = installIndexResources();

    return new RuleDataClient({
      feature,
      indexNames,
      indexOptions,
      resourceInstaller: this.resourceInstaller,
      isWriteEnabled: this.isWriteEnabled(),
      waitUntilIndexIsReady: () => installPromise,
    });
  }
}
