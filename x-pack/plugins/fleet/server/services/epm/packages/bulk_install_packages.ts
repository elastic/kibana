/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService } from '../../app_context';
import * as Registry from '../registry';

import type { InstallResult } from '../../../types';

import { installPackage, isPackageVersionOrLaterInstalled } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';

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
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const logger = appContextService.getLogger();

  const packagesResults = await Promise.allSettled(
    packagesToInstall.map(async (pkg) => {
      if (typeof pkg !== 'string') {
        return Promise.resolve(pkg);
      }

      return Registry.fetchFindLatestPackageOrThrow(pkg);
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

      const pkgkey = Registry.pkgToPkgKey(pkgKeyProps);

      const installResult = await installPackage({
        savedObjectsClient,
        esClient,
        pkgkey,
        installSource: 'registry',
        spaceId,
        force,
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
