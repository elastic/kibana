/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { appContextService } from '../../app_context';
import * as Registry from '../registry';

import type { InstallResult } from '../../../types';

import { installPackage, isPackageVersionOrLaterInstalled } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';
import { getBundledPackages } from './get_bundled_packages';

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToInstall: Array<string | { name: string; version: string }>;
  esClient: ElasticsearchClient;
  force?: boolean;
  spaceId: string;
  preferredSource?: 'registry' | 'bundled';
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToInstall,
  esClient,
  spaceId,
  force,
  preferredSource = 'registry',
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const logger = appContextService.getLogger();

  const bundledPackages = await getBundledPackages();

  const packagesResults = await Promise.allSettled(
    packagesToInstall.map((pkg) => {
      if (typeof pkg === 'string') return Registry.fetchFindLatestPackage(pkg);
      return Promise.resolve(pkg);
    })
  );

  logger.debug(
    `kicking off bulk install of ${packagesToInstall.join(
      ', '
    )} with preferred source of "${preferredSource}"`
  );

  const bulkInstallResults = await Promise.allSettled(
    packagesResults.map(async (result, index) => {
      const packageName = getNameFromPackagesToInstall(packagesToInstall, index);

      if (result.status === 'rejected') {
        return { name: packageName, error: result.reason };
      }

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
        return {
          name,
          version,
          result: {
            assets: [...installedEs, ...installedKibana],
            status: 'already_installed',
            installType: installedPackageResult.installType,
          } as InstallResult,
        };
      }

      let installResult: InstallResult;
      const pkgkey = Registry.pkgToPkgKey(pkgKeyProps);

      const bundledPackage = bundledPackages.find((pkg) => pkg.name === pkgkey);

      // If preferred source is bundled packages on disk, attempt to install from disk first, then fall back to registry
      if (preferredSource === 'bundled') {
        if (bundledPackage) {
          logger.debug(
            `kicking off install of ${pkgKeyProps.name}-${pkgKeyProps.version} from bundled package on disk`
          );
          installResult = await installPackage({
            savedObjectsClient,
            esClient,
            installSource: 'upload',
            archiveBuffer: bundledPackage.buffer,
            contentType: 'application/zip',
            spaceId,
          });
        } else {
          installResult = await installPackage({
            savedObjectsClient,
            esClient,
            pkgkey,
            installSource: 'registry',
            spaceId,
            force,
          });
        }
      } else {
        // If preferred source is registry, attempt to install from registry first, then fall back to bundled packages on disk
        installResult = await installPackage({
          savedObjectsClient,
          esClient,
          pkgkey,
          installSource: 'registry',
          spaceId,
          force,
        });

        // If we initially errored, try to install from bundled package on disk
        if (installResult.error && bundledPackage) {
          logger.debug(
            `kicking off install of ${pkgKeyProps.name}-${pkgKeyProps.version} from bundled package on disk`
          );
          installResult = await installPackage({
            savedObjectsClient,
            esClient,
            installSource: 'upload',
            archiveBuffer: bundledPackage.buffer,
            contentType: 'application/zip',
            spaceId,
          });
        }
      }

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
