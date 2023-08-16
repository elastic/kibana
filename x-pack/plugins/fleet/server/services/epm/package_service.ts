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

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

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
import type { FleetAuthzRouteConfig } from '../security/types';
import { checkSuperuser, getAuthzFromRequest, doesNotHaveRequiredFleetAuthz } from '../security';
import { FleetUnauthorizedError } from '../../errors';
import { INSTALL_PACKAGES_AUTHZ, READ_PACKAGE_INFO_AUTHZ } from '../../routes/epm';

import { installTransforms, isTransform } from './elasticsearch/transform/install';
import type { FetchFindLatestPackageOptions } from './registry';
import { fetchFindLatestPackageOrThrow, getPackage } from './registry';
import { ensureInstalledPackage, getInstallation, getPackages } from './packages';
import { generatePackageInfoFromArchiveBuffer } from './archive';

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

  readBundledPackage(
    bundledPackage: BundledPackage
  ): Promise<{ packageInfo: ArchivePackage; paths: string[] }>;

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
    const preflightCheck = async (requiredAuthz?: FleetAuthzRouteConfig['fleetAuthz']) => {
      if (requiredAuthz) {
        const requestedAuthz = await getAuthzFromRequest(request);

        const noRequiredAuthz = doesNotHaveRequiredFleetAuthz(requestedAuthz, requiredAuthz);
        if (noRequiredAuthz) {
          throw new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet packages.`
          );
        }
      } else if (!checkSuperuser(request)) {
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
  private authorizationHeader?: HTTPAuthorizationHeader | null = undefined;

  constructor(
    private readonly internalEsClient: ElasticsearchClient,
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly preflightCheck?: (
      requiredAuthz?: FleetAuthzRouteConfig['fleetAuthz']
    ) => void | Promise<void>,
    private readonly request?: KibanaRequest
  ) {}

  private getAuthorizationHeader() {
    if (this.request) {
      this.authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(this.request);
      return this.authorizationHeader;
    }
  }

  public async getInstallation(pkgName: string) {
    await this.#runPreflight(READ_PACKAGE_INFO_AUTHZ);
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
    await this.#runPreflight(INSTALL_PACKAGES_AUTHZ);

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
    await this.#runPreflight(READ_PACKAGE_INFO_AUTHZ);
    return fetchFindLatestPackageOrThrow(packageName, options);
  }

  public async readBundledPackage(bundledPackage: BundledPackage) {
    await this.#runPreflight(READ_PACKAGE_INFO_AUTHZ);
    return generatePackageInfoFromArchiveBuffer(bundledPackage.buffer, 'application/zip');
  }

  public async getPackage(
    packageName: string,
    packageVersion: string,
    options?: Parameters<typeof getPackage>['2']
  ) {
    await this.#runPreflight(READ_PACKAGE_INFO_AUTHZ);
    return getPackage(packageName, packageVersion, options);
  }

  public async getPackages(params?: {
    excludeInstallStatus?: false;
    category?: CategoryId;
    prerelease?: false;
  }) {
    const { excludeInstallStatus, category, prerelease } = params || {};
    await this.#runPreflight(READ_PACKAGE_INFO_AUTHZ);
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
    await this.#runPreflight(INSTALL_PACKAGES_AUTHZ);
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
    const authorizationHeader = this.getAuthorizationHeader();

    const { installedTransforms } = await installTransforms({
      installablePackage: packageInfo,
      paths,
      esClient: this.internalEsClient,
      savedObjectsClient: this.internalSoClient,
      logger: this.logger,
      force: true,
      esReferences: undefined,
      authorizationHeader,
    });
    return installedTransforms;
  }

  async #runPreflight(requiredAuthz?: FleetAuthzRouteConfig['fleetAuthz']) {
    if (this.preflightCheck) {
      return await this.preflightCheck(requiredAuthz);
    }
  }
}
