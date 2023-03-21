/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type {
  KibanaRequest,
  ElasticsearchClient,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';

import { appContextService } from '..';

import type { PackageList } from '../../../common';

import type {
  CategoryId,
  EsAssetReference,
  InstallablePackage,
  Installation,
  RegistryPackage,
  ArchivePackage,
  BundledPackage,
} from '../../types';
import { checkSuperuser } from '../security';
import { FleetUnauthorizedError } from '../../errors';

import type { APIKey } from './elasticsearch/transform/install';
import { installTransforms, isTransform } from './elasticsearch/transform/install';
import type { FetchFindLatestPackageOptions } from './registry';
import { fetchFindLatestPackageOrThrow, getPackage } from './registry';
import { ensureInstalledPackage, getInstallation, getPackages } from './packages';

export type InstalledAssetType = EsAssetReference;

export interface PackageService {
  asScoped(request: KibanaRequest): PackageClient;
  asInternalUser: PackageClient;
}

export interface PackageClient {
  getInstallation(pkgName: string): Promise<Installation | undefined>;

  ensureInstalledPackage(options: {
    pkgName: string;
    pkgVersion?: string;
    spaceId?: string;
  }): Promise<Installation | undefined>;

  fetchFindLatestPackage(
    packageName: string,
    options?: FetchFindLatestPackageOptions
  ): Promise<RegistryPackage | BundledPackage>;

  getPackage(
    packageName: string,
    packageVersion: string
  ): Promise<{ packageInfo: ArchivePackage; paths: string[] }>;

  getPackages(params?: {
    excludeInstallStatus?: false;
    category?: CategoryId;
    prerelease?: false;
  }): Promise<PackageList>;

  reinstallEsAssets(
    packageInfo: InstallablePackage,
    assetPaths: string[]
  ): Promise<InstalledAssetType[]>;
}

export class PackageServiceImpl implements PackageService {
  constructor(
    private readonly internalEsClient: ElasticsearchClient,
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  public asScoped(request: KibanaRequest) {
    // await this.initAPIKeyWithCurrentUserPermission(request);
    // console.log('this.apiKey', this.apiKey);
    const preflightCheck = () => {
      if (!checkSuperuser(request)) {
        throw new FleetUnauthorizedError(
          `User does not have adequate permissions to access Fleet packages.`
        );
      }
    };

    return new PackageClientImpl(
      this.internalEsClient,
      this.internalSoClient,
      this.logger,
      preflightCheck,
      request
    );
  }

  public get asInternalUser() {
    return new PackageClientImpl(this.internalEsClient, this.internalSoClient, this.logger);
  }
}

class PackageClientImpl implements PackageClient {
  private apiKeyWithCurrentUserPermission?: APIKey = undefined;

  constructor(
    private readonly internalEsClient: ElasticsearchClient,
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly preflightCheck?: () => void | Promise<void>,
    private readonly request?: KibanaRequest
  ) {}

  private async initAPIKeyWithCurrentUserPermission() {
    if (!this.apiKeyWithCurrentUserPermission && this.request) {
      const apiKeyWithCurrentUserPermission = await appContextService
        .getSecurity()
        .authc.apiKeys.grantAsInternalUser(this.request, {
          name: `auto-generated-transform-api-key`,
          role_descriptors: {},
        });

      if (apiKeyWithCurrentUserPermission) {
        this.apiKeyWithCurrentUserPermission = apiKeyWithCurrentUserPermission as APIKey;
        return this.apiKeyWithCurrentUserPermission;
      }
    }
  }

  public async getInstallation(pkgName: string) {
    await this.#runPreflight();
    return getInstallation({
      pkgName,
      savedObjectsClient: this.internalSoClient,
    });
  }

  public async ensureInstalledPackage(options: {
    pkgName: string;
    pkgVersion?: string;
    spaceId?: string;
  }): Promise<Installation | undefined> {
    await this.#runPreflight();

    return ensureInstalledPackage({
      ...options,
      esClient: this.internalEsClient,
      savedObjectsClient: this.internalSoClient,
    });
  }

  public async fetchFindLatestPackage(
    packageName: string,
    options?: FetchFindLatestPackageOptions
  ): Promise<RegistryPackage | BundledPackage> {
    await this.#runPreflight();
    return fetchFindLatestPackageOrThrow(packageName, options);
  }

  public async getPackage(
    packageName: string,
    packageVersion: string,
    options?: Parameters<typeof getPackage>['2']
  ) {
    await this.#runPreflight();
    return getPackage(packageName, packageVersion, options);
  }

  public async getPackages(params?: {
    excludeInstallStatus?: false;
    category?: CategoryId;
    prerelease?: false;
  }) {
    const { excludeInstallStatus, category, prerelease } = params || {};
    await this.#runPreflight();
    return getPackages({
      savedObjectsClient: this.internalSoClient,
      excludeInstallStatus,
      category,
      prerelease,
    });
  }

  public async reinstallEsAssets(
    packageInfo: InstallablePackage,
    assetPaths: string[]
  ): Promise<InstalledAssetType[]> {
    await this.#runPreflight();
    let installedAssets: InstalledAssetType[] = [];

    const transformPaths = assetPaths.filter(isTransform);

    if (transformPaths.length !== assetPaths.length) {
      throw new Error('reinstallEsAssets is currently only implemented for transform assets');
    }

    if (transformPaths.length) {
      const installedTransformAssets = await this.#reinstallTransforms(packageInfo, transformPaths);
      installedAssets = [...installedAssets, ...installedTransformAssets];
    }

    return installedAssets;
  }

  async #reinstallTransforms(packageInfo: InstallablePackage, paths: string[]) {
    const apiKeyWithCurrentUserPermission = await this.initAPIKeyWithCurrentUserPermission();

    const { installedTransforms } = await installTransforms(
      packageInfo,
      paths,
      this.internalEsClient,
      this.internalSoClient,
      this.logger,
      undefined,
      apiKeyWithCurrentUserPermission
    );
    return installedTransforms;
  }

  #runPreflight() {
    if (this.preflightCheck) {
      return this.preflightCheck();
    }
  }
}
