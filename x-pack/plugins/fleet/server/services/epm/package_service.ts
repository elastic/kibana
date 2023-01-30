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

import type {
  EsAssetReference,
  InstallablePackage,
  Installation,
  RegistryPackage,
  ArchivePackage,
  BundledPackage,
} from '../../types';
import { checkSuperuser } from '../security';
import { FleetUnauthorizedError } from '../../errors';

import { installTransforms, isTransform } from './elasticsearch/transform/install';
import type { FetchFindLatestPackageOptions } from './registry';
import { fetchFindLatestPackageOrThrow, getPackage } from './registry';
import { ensureInstalledPackage, getInstallation } from './packages';

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
      preflightCheck
    );
  }

  public get asInternalUser() {
    return new PackageClientImpl(this.internalEsClient, this.internalSoClient, this.logger);
  }
}

class PackageClientImpl implements PackageClient {
  constructor(
    private readonly internalEsClient: ElasticsearchClient,
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly preflightCheck?: () => void | Promise<void>
  ) {}

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
    const { installedTransforms } = await installTransforms(
      packageInfo,
      paths,
      this.internalEsClient,
      this.internalSoClient,
      this.logger
    );
    return installedTransforms;
  }

  #runPreflight() {
    if (this.preflightCheck) {
      return this.preflightCheck();
    }
  }
}
