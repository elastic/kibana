/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import pLimit from 'p-limit';
import { uniqBy } from 'lodash';

import type { HTTPAuthorizationHeader } from '../../../../common/http_authorization_header';

import { appContextService } from '../../app_context';
import * as Registry from '../registry';

import type { InstallResult } from '../../../types';

import { installPackage, isPackageVersionOrLaterInstalled } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';

// Fallback value for maxConcurrentBulkInstallations if `xpack.fleet.internal` is not defined
const DEFAULT_MAX_CONCURRENT_INSTALLS = 5;

// These packages can't be included in bulk install operations due to their size or other factors
const FORBIDDEN_BULK_INSTALL_PACKAGE_NAMES = ['security_detection_engine'];

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToInstall: Array<
    | string
    | { name: string; version?: string; prerelease?: boolean; skipDataStreamRollover?: boolean }
  >;
  esClient: ElasticsearchClient;
  force?: boolean;
  spaceId: string;
  preferredSource?: 'registry' | 'bundled';
  prerelease?: boolean;
  authorizationHeader?: HTTPAuthorizationHeader | null;
  skipIfInstalled?: boolean;
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToInstall,
  esClient,
  spaceId,
  force,
  prerelease,
  authorizationHeader,
  skipIfInstalled,
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const logger = appContextService.getLogger();

  const uniquePackages = uniqBy(packagesToInstall, (pkg) => {
    if (typeof pkg === 'string') {
      return pkg;
    }

    return pkg.name;
  });

  const forbiddenPackages = uniquePackages
    .filter((pkg) =>
      typeof pkg === 'string'
        ? FORBIDDEN_BULK_INSTALL_PACKAGE_NAMES.includes(pkg)
        : FORBIDDEN_BULK_INSTALL_PACKAGE_NAMES.includes(pkg.name)
    )
    .map((pkg) => (typeof pkg === 'string' ? pkg : pkg.name));

  if (forbiddenPackages.length > 0) {
    logger.warn(
      `Package(s) cannot be bulk installed and will be ignored: ${forbiddenPackages.join(',')}`
    );
  }

  const filteredPackagesToInstall = uniquePackages.filter(
    (pkg) => !forbiddenPackages.includes(typeof pkg === 'string' ? pkg : pkg.name)
  );

  const maxConcurrentInstalls =
    appContextService.getConfig()?.internal?.maxConcurrentBulkInstallations ??
    DEFAULT_MAX_CONCURRENT_INSTALLS;

  const limiter = pLimit(maxConcurrentInstalls);

  const packagesResults = await Promise.allSettled<{
    name: string;
    version: string;
    prerelease?: boolean;
    skipDataStreamRollover?: boolean;
    forbidden?: boolean;
  }>(
    filteredPackagesToInstall.map(async (pkg) => {
      return limiter(async () => {
        const packageName = typeof pkg === 'string' ? pkg : pkg.name;
        const isPackageForbidden = FORBIDDEN_BULK_INSTALL_PACKAGE_NAMES.includes(packageName);

        if (isPackageForbidden) {
          logger.warn(`Package cannot be bulk installed and will be ignored: ${packageName}`);

          return Promise.resolve({
            name: packageName,
            version: '',
            prerelease: undefined,
            skipDataStreamRollover: undefined,
            forbidden: true,
          });
        }

        if (typeof pkg === 'string') {
          return Registry.fetchFindLatestPackageOrThrow(pkg, {
            prerelease,
          }).then((pkgRes) => ({
            name: pkgRes.name,
            version: pkgRes.version ?? '',
            prerelease: undefined,
            skipDataStreamRollover: undefined,
          }));
        }
        if (pkg.version !== undefined) {
          return Promise.resolve({ ...pkg, version: pkg.version ?? '' });
        }

        return Registry.fetchFindLatestPackageOrThrow(pkg.name, {
          prerelease: prerelease || pkg.prerelease,
        }).then((pkgRes) => ({
          name: pkgRes.name,
          version: pkgRes.version ?? '',
          prerelease: pkg.prerelease,
          skipDataStreamRollover: pkg.skipDataStreamRollover,
        }));
      });
    })
  );

  logger.debug(
    `kicking off bulk install of ${packagesToInstall
      .map((pkg) => (typeof pkg === 'string' ? pkg : pkg.name))
      .join(', ')}`
  );

  const bulkInstallResults = await Promise.allSettled(
    packagesResults.map(async (result, index) => {
      const packageName = getNameFromPackagesToInstall(packagesToInstall, index);

      if (result.status === 'rejected') {
        return { name: packageName, error: result.reason };
      }

      if (result.value.forbidden) {
        return {
          name: packageName,
          status: 'not_installed',
          error: new Error(
            `Bulk installation of ${packageName} is forbidden. Please install it via the single package installation API.`
          ),
        };
      }

      const pkgKeyProps: {
        name: string;
        version: string;
        prerelease?: boolean;
        skipDataStreamRollover?: boolean;
        forbidden?: boolean;
      } = result.value;

      if (!force || skipIfInstalled) {
        const installedPackageResult = await isPackageVersionOrLaterInstalled({
          savedObjectsClient,
          pkgName: pkgKeyProps.name,
          pkgVersion: pkgKeyProps.version ?? '',
        });

        if (installedPackageResult) {
          const {
            name,
            version,
            installed_es: installedEs,
            installed_kibana: installedKibana,
          } = installedPackageResult.package;
          return {
            name,
            version: version ?? '',
            result: {
              assets: [...installedEs, ...installedKibana],
              status: 'already_installed',
              installType: 'unknown',
            } as InstallResult,
          };
        }
      }

      const pkgkey = Registry.pkgToPkgKey(pkgKeyProps);

      const installResult = await installPackage({
        savedObjectsClient,
        esClient,
        pkgkey,
        installSource: 'registry',
        spaceId,
        force,
        prerelease: prerelease || ('prerelease' in pkgKeyProps && pkgKeyProps.prerelease),
        authorizationHeader,
        skipDataStreamRollover: pkgKeyProps.skipDataStreamRollover,
      });

      if (installResult.error) {
        return {
          name: packageName,
          error: installResult.error,
          installType: installResult.installType,
        };
      }
      return {
        name: packageName,
        version: pkgKeyProps.version,
        result: installResult,
      };
    })
  );

  return bulkInstallResults.map((result, index) => {
    const packageName = getNameFromPackagesToInstall(packagesToInstall, index);
    if (result.status === 'fulfilled') {
      if (result.value && result.value.error) {
        return {
          name: packageName,
          error: result.value.error,
          installType: result.value.installType,
        };
      } else {
        return result.value;
      }
    } else {
      return { name: packageName, error: result.reason };
    }
  });
}

export function isBulkInstallError(
  installResponse: any
): installResponse is IBulkInstallPackageError {
  return 'error' in installResponse && installResponse.error instanceof Error;
}

function getNameFromPackagesToInstall(
  packagesToInstall: BulkInstallPackagesParams['packagesToInstall'],
  index: number
) {
  const entry = packagesToInstall[index];
  if (typeof entry === 'string') return entry;
  return entry.name;
}
