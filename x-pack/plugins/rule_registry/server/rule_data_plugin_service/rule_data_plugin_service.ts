/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Either, isLeft, left, right } from 'fp-ts/lib/Either';
import { ValidFeatureId } from '@kbn/rule-data-utils';

import { ElasticsearchClient, Logger } from 'kibana/server';

import { INDEX_PREFIX } from '../config';
import { IRuleDataClient, RuleDataClient, WaitResult } from '../rule_data_client';
import { IndexInfo } from './index_info';
import { Dataset, IndexOptions } from './index_options';
import { IResourceInstaller, ResourceInstaller } from './resource_installer';
import { joinWithDash } from './utils';

/**
 * A service for creating and using Elasticsearch indices for alerts-as-data.
 */
export interface IRuleDataService {
  /**
   * Returns a prefix used in the naming scheme of index aliases, templates
   * and other Elasticsearch resources that this service creates
   * for alerts-as-data indices.
   */
  getResourcePrefix(): string;

  /**
   * Prepends a relative resource name with the resource prefix.
   * @returns Full name of the resource.
   * @example 'security.alerts' => '.alerts-security.alerts'
   */
  getResourceName(relativeName: string): string;

  /**
   * If write is enabled for the specified registration context, everything works as usual.
   * If it's disabled, writing to the registration context's alerts-as-data indices will be disabled,
   * and also Elasticsearch resources associated with the indices will not be
   * installed.
   */
  isWriteEnabled(registrationContext: string): boolean;

  /**
   * If writer cache is enabled (the default), the writer will be cached
   * after being initialized. Disabling this is useful for tests, where we
   * expect to easily be able to clean up after ourselves between test cases.
   */
  isWriterCacheEnabled(): boolean;

  /**
   * Installs common Elasticsearch resources used by all alerts-as-data indices.
   */
  initializeService(): void;

  /**
   * Initializes alerts-as-data index and starts index bootstrapping right away.
   * @param indexOptions Index parameters: names and resources.
   * @returns Client for reading and writing data to this index.
   */
  initializeIndex(indexOptions: IndexOptions): IRuleDataClient;

  /**
   * Looks up the index information associated with the given registration context and dataset.
   */
  findIndexByName(registrationContext: string, dataset: Dataset): IndexInfo | null;

  /**
   * Looks up the index information associated with the given Kibana "feature".
   * Note: features are used in RBAC.
   */
  findIndicesByFeature(featureId: ValidFeatureId, dataset?: Dataset): IndexInfo[];
}

// TODO: This is a leftover. Remove its usage from the "observability" plugin and delete it.
export type RuleDataPluginService = IRuleDataService;

interface ConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  kibanaVersion: string;
  isWriteEnabled: boolean;
  isWriterCacheEnabled: boolean;
  disabledRegistrationContexts: string[];
}

export class RuleDataService implements IRuleDataService {
  private readonly indicesByBaseName: Map<string, IndexInfo>;
  private readonly indicesByFeatureId: Map<string, IndexInfo[]>;
  private readonly resourceInstaller: IResourceInstaller;
  private installCommonResources: Promise<Either<Error, 'ok'>>;
  private isInitialized: boolean;

  constructor(private readonly options: ConstructorOptions) {
    this.indicesByBaseName = new Map();
    this.indicesByFeatureId = new Map();
    this.resourceInstaller = new ResourceInstaller({
      getResourceName: (name) => this.getResourceName(name),
      getClusterClient: options.getClusterClient,
      logger: options.logger,
      disabledRegistrationContexts: options.disabledRegistrationContexts,
      isWriteEnabled: options.isWriteEnabled,
    });

    this.installCommonResources = Promise.resolve(right('ok'));
    this.isInitialized = false;
  }

  public getResourcePrefix(): string {
    return INDEX_PREFIX;
  }

  public getResourceName(relativeName: string): string {
    return joinWithDash(this.getResourcePrefix(), relativeName);
  }

  public isWriteEnabled(registrationContext: string): boolean {
    return this.options.isWriteEnabled && !this.isRegistrationContextDisabled(registrationContext);
  }

  public isRegistrationContextDisabled(registrationContext: string): boolean {
    return this.options.disabledRegistrationContexts.includes(registrationContext);
  }

  /**
   * If writer cache is enabled (the default), the writer will be cached
   * after being initialized. Disabling this is useful for tests, where we
   * expect to easily be able to clean up after ourselves between test cases.
   */
  public isWriterCacheEnabled(): boolean {
    return this.options.isWriterCacheEnabled;
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

  public initializeIndex(indexOptions: IndexOptions): IRuleDataClient {
    if (!this.isInitialized) {
      throw new Error(
        'Rule data service is not initialized. Make sure to call initializeService() in the rule registry plugin setup phase'
      );
    }
    const { registrationContext } = indexOptions;
    const indexInfo = new IndexInfo({ indexOptions, kibanaVersion: this.options.kibanaVersion });

    const indicesAssociatedWithFeature = this.indicesByFeatureId.get(indexOptions.feature) ?? [];
    this.indicesByFeatureId.set(indexOptions.feature, [...indicesAssociatedWithFeature, indexInfo]);
    this.indicesByBaseName.set(indexInfo.baseName, indexInfo);

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
        if (!this.isRegistrationContextDisabled(registrationContext)) {
          await this.resourceInstaller.installIndexLevelResources(indexInfo);
        }

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
      isWriteEnabled: this.isWriteEnabled(registrationContext),
      isWriterCacheEnabled: this.isWriterCacheEnabled(),
      waitUntilReadyForReading,
      waitUntilReadyForWriting,
      logger: this.options.logger,
    });
  }

  public findIndexByName(registrationContext: string, dataset: Dataset): IndexInfo | null {
    const baseName = this.getResourceName(`${registrationContext}.${dataset}`);
    return this.indicesByBaseName.get(baseName) ?? null;
  }

  public findIndicesByFeature(featureId: ValidFeatureId, dataset?: Dataset): IndexInfo[] {
    const foundIndices = this.indicesByFeatureId.get(featureId) ?? [];
    return dataset ? foundIndices.filter((i) => i.indexOptions.dataset === dataset) : foundIndices;
  }
}
