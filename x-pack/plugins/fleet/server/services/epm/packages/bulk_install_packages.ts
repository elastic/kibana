/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { appContextService } from '../../app_context';
import * as Registry from '../registry';
import { installIndexPatterns } from '../kibana/index_pattern/install';

import type { InstallResult } from '../../../types';

import { AUTO_UPDATE_PACKAGES, DEFAULT_PACKAGES } from '../../../constants';

import { installPackage, isPackageVersionOrLaterInstalled } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';
import { removeInstallation } from './remove';

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToInstall: Array<string | { name: string; version: string }>;
  esClient: ElasticsearchClient;
  force?: boolean;
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToInstall,
  esClient,
  force,
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const logger = appContextService.getLogger();
  const installSource = 'registry';
  const packagesResults = await Promise.allSettled(
    packagesToInstall.map((pkg) => {
      if (typeof pkg === 'string') return Registry.fetchFindLatestPackage(pkg);
      return Promise.resolve(pkg);
    })
  );

  logger.debug(`kicking off bulk install of ${packagesToInstall.join(', ')} from registry`);
  const bulkInstallResults = await Promise.allSettled(
    packagesResults.map(async (result, index) => {
      const packageName = getNameFromPackagesToInstall(packagesToInstall, index);

      if (result.status === 'fulfilled') {
        const pkgKeyProps = result.value;
        const installedPackageResult = await isPackageVersionOrLaterInstalled({
          savedObjectsClient,
          pkgName: pkgKeyProps.name,
          pkgVersion: pkgKeyProps.version,
        });

        if (installedPackageResult) {
          const {
            name,
            version,
            installed_es: installedEs,
            installed_kibana: installedKibana,
          } = installedPackageResult.package;

          const isManagedPackage = [...DEFAULT_PACKAGES, ...AUTO_UPDATE_PACKAGES].some(
            (pkg) => pkg.name === name
          );

          const shouldOverwriteManagedPackageVersion =
            isManagedPackage && version !== pkgKeyProps.version;

          if (!shouldOverwriteManagedPackageVersion) {
            // If the version provided and the installed version match, then simply respond w/ a no-op
            return {
              name,
              version,
              result: {
                assets: [...installedEs, ...installedKibana],
                status: 'already_installed',
                installType: installedPackageResult.installType,
              } as InstallResult,
            };
          } else {
            // If the version provided and the installed version do not match, we need to override the existing installation
            // for managed packages. e.g. if a version of `system` is installed that's out of sync w/ the registry or version
            // specified by preconfiguration, we need to replace it
            logger.debug(
              `Found out-of-sync version "${version}" of managed package "${name}". Removing and replacing with provided version "${pkgKeyProps.version}"".`
            );

            await removeInstallation({
              savedObjectsClient,
              esClient,
              pkgkey: Registry.pkgToPkgKey(pkgKeyProps),
            });
          }
        }
        const installResult = await installPackage({
          savedObjectsClient,
          esClient,
          pkgkey: Registry.pkgToPkgKey(pkgKeyProps),
          installSource,
          skipPostInstall: true,
          force,
        });
        if (installResult.error) {
          return {
            name: packageName,
            error: installResult.error,
            installType: installResult.installType,
          };
        } else {
          return {
            name: packageName,
            version: pkgKeyProps.version,
            result: installResult,
          };
        }
      }
      return { name: packageName, error: result.reason };
    })
  );

  // only install index patterns if we completed install for any package-version for the
  // first time, aka fresh installs or upgrades
  if (
    bulkInstallResults.find(
      (result) =>
        result.status === 'fulfilled' &&
        !result.value.result?.error &&
        result.value.result?.status === 'installed'
    )
  ) {
    await installIndexPatterns({ savedObjectsClient, esClient, installSource });
  }

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
