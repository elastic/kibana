/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Either, isLeft, left, right } from 'fp-ts/lib/Either';

import { ElasticsearchClient, Logger } from 'kibana/server';

import { IRuleDataClient, RuleDataClient, WaitResult } from '../rule_data_client';
import { IndexInfo } from './index_info';
import { IndexOptions } from './index_options';
import { ResourceInstaller } from './resource_installer';
import { joinWithDash } from './utils';

interface ConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  index: string;
}

/**
 * A service for creating and using Elasticsearch indices for alerts-as-data.
 */
export class RuleDataPluginService {
  private readonly resourceInstaller: ResourceInstaller;
  private installCommonResources: Promise<Either<Error, 'ok'>>;
  private isInitialized: boolean;
  private registeredIndices: Map<string, IndexInfo> = new Map();

  constructor(private readonly options: ConstructorOptions) {
    this.resourceInstaller = new ResourceInstaller({
      getResourceName: (name) => this.getResourceName(name),
      getClusterClient: options.getClusterClient,
      logger: options.logger,
      isWriteEnabled: options.isWriteEnabled,
    });

    this.installCommonResources = Promise.resolve(right('ok'));
    this.isInitialized = false;
  }

  /**
   * Returns a full resource prefix.
   *   - it's '.alerts' by default
   *   - it can be adjusted by the user via Kibana config
   */
  public getResourcePrefix(): string {
    // TODO: https://github.com/elastic/kibana/issues/106432
    return this.options.index;
  }

  /**
   * Prepends a relative resource name with a full resource prefix, which
   * starts with '.alerts' and can optionally include a user-defined part in it.
   * @returns Full name of the resource.
   * @example 'security.alerts' => '.alerts-security.alerts'
   */
  public getResourceName(relativeName: string): string {
    return joinWithDash(this.getResourcePrefix(), relativeName);
  }

  /**
   * If write is enabled, everything works as usual.
   * If it's disabled, writing to all alerts-as-data indices will be disabled,
   * and also Elasticsearch resources associated with the indices will not be
   * installed.
   */
  public isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  /**
   * Installs common Elasticsearch resources used by all alerts-as-data indices.
   */
  public initializeService(): void {
    // Run the installation of common resources and handle exceptions.
    this.installCommonResources = this.resourceInstaller
      .installCommonResources()
      .then(() => right('ok' as const))
      .catch((e) => {
        this.options.logger.error(e);
        return left(e); // propagates it to the index initialization phase
      });

    this.isInitialized = true;
  }

  /**
   * Initializes alerts-as-data index and starts index bootstrapping right away.
   * @param indexOptions Index parameters: names and resources.
   * @returns Client for reading and writing data to this index.
   */
  public initializeIndex(indexOptions: IndexOptions): IRuleDataClient {
    if (!this.isInitialized) {
      throw new Error(
        'Rule data service is not initialized. Make sure to call initializeService() in the rule registry plugin setup phase'
      );
    }

    const indexInfo = new IndexInfo({
      getResourceName: (name) => this.getResourceName(name),
      indexOptions,
    });

    this.registeredIndices.set(indexOptions.registrationContext, indexInfo);

    const waitUntilClusterClientAvailable = async (): Promise<WaitResult> => {
      try {
        const clusterClient = await this.options.getClusterClient();
        return right(clusterClient);
      } catch (e) {
        this.options.logger.error(e);
        return left(e);
      }
    };

    const waitUntilIndexResourcesInstalled = async (): Promise<WaitResult> => {
      try {
        const result = await this.installCommonResources;
        if (isLeft(result)) {
          return result;
        }

        await this.resourceInstaller.installIndexLevelResources(indexInfo);

        const clusterClient = await this.options.getClusterClient();
        return right(clusterClient);
      } catch (e) {
        this.options.logger.error(e);
        return left(e);
      }
    };

    // Start initialization now, including installation of index resources.
    // Let's unblock read operations since installation can take quite some time.
    // Write operations will have to wait, of course.
    // NOTE: these promises cannot reject, otherwise it will lead to an
    // unhandled promise rejection shutting down Kibana process.
    const waitUntilReadyForReading = waitUntilClusterClientAvailable();
    const waitUntilReadyForWriting = waitUntilIndexResourcesInstalled();

    return new RuleDataClient({
      indexInfo,
      resourceInstaller: this.resourceInstaller,
      isWriteEnabled: this.isWriteEnabled(),
      waitUntilReadyForReading,
      waitUntilReadyForWriting,
    });
  }

  /**
   * Looks up the index information associated with the given `registrationContext`.
   * @param registrationContext
   * @returns the IndexInfo or undefined
   */
  public getRegisteredIndexInfo(registrationContext: string): IndexInfo | undefined {
    return this.registeredIndices.get(registrationContext);
  }
}
