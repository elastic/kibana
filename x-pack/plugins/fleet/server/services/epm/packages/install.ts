/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';
import type Boom from '@hapi/boom';
import type { ElasticsearchClient, SavedObject, SavedObjectsClientContract } from 'src/core/server';

import { generateESIndexPatterns } from '../elasticsearch/template/template';

import type { BulkInstallPackageInfo, InstallablePackage, InstallSource } from '../../../../common';
import {
  IngestManagerError,
  PackageOperationNotSupportedError,
  PackageOutdatedError,
} from '../../../errors';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
import type { KibanaAssetType } from '../../../types';
import type {
  Installation,
  AssetType,
  EsAssetReference,
  InstallType,
  InstallResult,
} from '../../../types';
import { appContextService } from '../../app_context';
import * as Registry from '../registry';
import { setPackageInfo, parseAndVerifyArchiveEntries, unpackBufferToCache } from '../archive';
import { toAssetReference } from '../kibana/assets/install';
import type { ArchiveAsset } from '../kibana/assets/install';
import { installIndexPatterns } from '../kibana/index_pattern/install';

import { isUnremovablePackage, getInstallation, getInstallationObject } from './index';
import { removeInstallation } from './remove';
import { getPackageSavedObjects } from './get';
import { _installPackage } from './_install_package';

export async function isPackageInstalled(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}): Promise<boolean> {
  const installedPackage = await getInstallation(options);
  return installedPackage !== undefined;
}

export async function isPackageVersionOrLaterInstalled(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
}): Promise<{ package: Installation; installType: InstallType } | false> {
  const { savedObjectsClient, pkgName, pkgVersion } = options;
  const installedPackageObject = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedPackage = installedPackageObject?.attributes;
  if (
    installedPackage &&
    (installedPackage.version === pkgVersion || semverLt(pkgVersion, installedPackage.version))
  ) {
    let installType: InstallType;
    try {
      installType = getInstallType({ pkgVersion, installedPkg: installedPackageObject });
    } catch (e) {
      installType = 'unknown';
    }
    return { package: installedPackage, installType };
  }
  return false;
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  esClient: ElasticsearchClient;
  pkgVersion?: string;
}): Promise<Installation> {
  const { savedObjectsClient, pkgName, esClient, pkgVersion } = options;

  // If pkgVersion isn't specified, find the latest package version
  const pkgKeyProps = pkgVersion
    ? { name: pkgName, version: pkgVersion }
    : await Registry.fetchFindLatestPackage(pkgName);

  const installedPackageResult = await isPackageVersionOrLaterInstalled({
    savedObjectsClient,
    pkgName: pkgKeyProps.name,
    pkgVersion: pkgKeyProps.version,
  });
  if (installedPackageResult) {
    return installedPackageResult.package;
  }
  const pkgkey = Registry.pkgToPkgKey(pkgKeyProps);
  const installResult = await installPackage({
    installSource: 'registry',
    savedObjectsClient,
    pkgkey,
    esClient,
    force: true, // Always force outdated packages to be installed if a later version isn't installed
  });

  if (installResult.error) {
    const errorPrefix =
      installResult.installType === 'update' || installResult.installType === 'reupdate'
        ? i18n.translate('xpack.fleet.epm.install.packageUpdateError', {
            defaultMessage: 'Error updating {pkgName} to {pkgVersion}',
            values: {
              pkgName: pkgKeyProps.name,
              pkgVersion: pkgKeyProps.version,
            },
          })
        : i18n.translate('xpack.fleet.epm.install.packageInstallError', {
            defaultMessage: 'Error installing {pkgName} {pkgVersion}',
            values: {
              pkgName: pkgKeyProps.name,
              pkgVersion: pkgKeyProps.version,
            },
          });
    throw new Error(`${errorPrefix}: ${installResult.error.message}`);
  }

  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) throw new Error(`could not get installation ${pkgName}`);
  return installation;
}

export async function handleInstallPackageFailure({
  savedObjectsClient,
  error,
  pkgName,
  pkgVersion,
  installedPkg,
  esClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  error: IngestManagerError | Boom.Boom | Error;
  pkgName: string;
  pkgVersion: string;
  installedPkg: SavedObject<Installation> | undefined;
  esClient: ElasticsearchClient;
}) {
  if (error instanceof IngestManagerError) {
    return;
  }
  const logger = appContextService.getLogger();
  const pkgkey = Registry.pkgToPkgKey({
    name: pkgName,
    version: pkgVersion,
  });

  // if there is an unknown server error, uninstall any package assets or reinstall the previous version if update
  try {
    const installType = getInstallType({ pkgVersion, installedPkg });
    if (installType === 'install' || installType === 'reinstall') {
      logger.error(`uninstalling ${pkgkey} after error installing`);
      await removeInstallation({ savedObjectsClient, pkgkey, esClient });
    }

    if (installType === 'update') {
      if (!installedPkg) {
        logger.error(
          `failed to rollback package after installation error ${error} because saved object was undefined`
        );
        return;
      }
      const prevVersion = `${pkgName}-${installedPkg.attributes.version}`;
      logger.error(`rolling back to ${prevVersion} after error installing ${pkgkey}`);
      await installPackage({
        installSource: 'registry',
        savedObjectsClient,
        pkgkey: prevVersion,
        esClient,
        force: true,
      });
    }
  } catch (e) {
    logger.error(`failed to uninstall or rollback package after installation error ${e}`);
  }
}

export interface IBulkInstallPackageError {
  name: string;
  error: Error;
  installType?: InstallType;
}
export type BulkInstallResponse = BulkInstallPackageInfo | IBulkInstallPackageError;

interface InstallRegistryPackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  esClient: ElasticsearchClient;
  force?: boolean;
}

async function installPackageFromRegistry({
  savedObjectsClient,
  pkgkey,
  esClient,
  force = false,
}: InstallRegistryPackageParams): Promise<InstallResult> {
  const logger = appContextService.getLogger();
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);

  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';

  try {
    // get the currently installed package
    const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
    installType = getInstallType({ pkgVersion, installedPkg });

    // get latest package version
    const latestPackage = await Registry.fetchFindLatestPackage(pkgName);

    // let the user install if using the force flag or needing to reinstall or install a previous version due to failed update
    const installOutOfDateVersionOk =
      force || ['reinstall', 'reupdate', 'rollback'].includes(installType);

    // if the requested version is the same as installed version, check if we allow it based on
    // current installed package status and force flag, if we don't allow it,
    // just return the asset references from the existing installation
    if (
      installedPkg?.attributes.version === pkgVersion &&
      installedPkg?.attributes.install_status === 'installed'
    ) {
      if (!force) {
        logger.debug(`${pkgkey} is already installed, skipping installation`);
        return {
          assets: [
            ...installedPkg.attributes.installed_es,
            ...installedPkg.attributes.installed_kibana,
          ],
          status: 'already_installed',
          installType,
        };
      }
    }

    // if the requested version is out-of-date of the latest package version, check if we allow it
    // if we don't allow it, return an error
    if (semverLt(pkgVersion, latestPackage.version)) {
      if (!installOutOfDateVersionOk) {
        throw new PackageOutdatedError(
          `${pkgkey} is out-of-date and cannot be installed or updated`
        );
      }
      logger.debug(
        `${pkgkey} is out-of-date, installing anyway due to ${
          force ? 'force flag' : `install type ${installType}`
        }`
      );
    }

    // get package info
    const { paths, packageInfo } = await Registry.getRegistryPackage(pkgName, pkgVersion);

    // try installing the package, if there was an error, call error handler and rethrow
    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return _installPackage({
      savedObjectsClient,
      esClient,
      installedPkg,
      paths,
      packageInfo,
      installType,
      installSource: 'registry',
    })
      .then((assets) => {
        return { assets, status: 'installed', installType };
      })
      .catch(async (err: Error) => {
        await handleInstallPackageFailure({
          savedObjectsClient,
          error: err,
          pkgName,
          pkgVersion,
          installedPkg,
          esClient,
        });
        return { error: err, installType };
      });
  } catch (e) {
    return {
      error: e,
      installType,
    };
  }
}

interface InstallUploadedArchiveParams {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  archiveBuffer: Buffer;
  contentType: string;
}

async function installPackageByUpload({
  savedObjectsClient,
  esClient,
  archiveBuffer,
  contentType,
}: InstallUploadedArchiveParams): Promise<InstallResult> {
  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';
  try {
    const { packageInfo } = await parseAndVerifyArchiveEntries(archiveBuffer, contentType);

    const installedPkg = await getInstallationObject({
      savedObjectsClient,
      pkgName: packageInfo.name,
    });

    installType = getInstallType({ pkgVersion: packageInfo.version, installedPkg });
    if (installType !== 'install') {
      throw new PackageOperationNotSupportedError(
        `Package upload only supports fresh installations. Package ${packageInfo.name} is already installed, please uninstall first.`
      );
    }

    const installSource = 'upload';
    const paths = await unpackBufferToCache({
      name: packageInfo.name,
      version: packageInfo.version,
      installSource,
      archiveBuffer,
      contentType,
    });

    setPackageInfo({
      name: packageInfo.name,
      version: packageInfo.version,
      packageInfo,
    });
    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return _installPackage({
      savedObjectsClient,
      esClient,
      installedPkg,
      paths,
      packageInfo,
      installType,
      installSource,
    })
      .then((assets) => {
        return { assets, status: 'installed', installType };
      })
      .catch(async (err: Error) => {
        return { error: err, installType };
      });
  } catch (e) {
    return { error: e, installType };
  }
}

export type InstallPackageParams = {
  skipPostInstall?: boolean;
} & (
  | ({ installSource: Extract<InstallSource, 'registry'> } & InstallRegistryPackageParams)
  | ({ installSource: Extract<InstallSource, 'upload'> } & InstallUploadedArchiveParams)
);

export async function installPackage(args: InstallPackageParams) {
  if (!('installSource' in args)) {
    throw new Error('installSource is required');
  }
  const logger = appContextService.getLogger();
  const { savedObjectsClient, esClient, skipPostInstall = false, installSource } = args;

  if (args.installSource === 'registry') {
    const { pkgkey, force } = args;
    const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);
    logger.debug(`kicking off install of ${pkgkey} from registry`);
    const response = installPackageFromRegistry({
      savedObjectsClient,
      pkgkey,
      esClient,
      force,
    }).then(async (installResult) => {
      if (skipPostInstall || installResult.error) {
        return installResult;
      }
      logger.debug(`install of ${pkgkey} finished, running post-install`);
      return installIndexPatterns({
        savedObjectsClient,
        esClient,
        pkgName,
        pkgVersion,
        installSource,
      }).then(() => installResult);
    });
    return response;
  } else if (args.installSource === 'upload') {
    const { archiveBuffer, contentType } = args;
    logger.debug(`kicking off install of uploaded package`);
    const response = installPackageByUpload({
      savedObjectsClient,
      esClient,
      archiveBuffer,
      contentType,
    }).then(async (installResult) => {
      if (skipPostInstall || installResult.error) {
        return installResult;
      }
      logger.debug(`install of uploaded package finished, running post-install`);
      return installIndexPatterns({
        savedObjectsClient,
        esClient,
        installSource,
      }).then(() => installResult);
    });
    return response;
  }
  // @ts-expect-error s/b impossibe b/c `never` by this point, but just in case
  throw new Error(`Unknown installSource: ${args.installSource}`);
}

export const updateVersion = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) => {
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    version: pkgVersion,
  });
};
export async function createInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  packageInfo: InstallablePackage;
  installSource: InstallSource;
}) {
  const { savedObjectsClient, packageInfo, installSource } = options;
  const { internal = false, name: pkgName, version: pkgVersion } = packageInfo;
  const removable = !isUnremovablePackage(pkgName);
  const toSaveESIndexPatterns = generateESIndexPatterns(packageInfo.data_streams);

  const created = await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed_kibana: [],
      installed_es: [],
      package_assets: [],
      es_index_patterns: toSaveESIndexPatterns,
      name: pkgName,
      version: pkgVersion,
      internal,
      removable,
      install_version: pkgVersion,
      install_status: 'installing',
      install_started_at: new Date().toISOString(),
      install_source: installSource,
    },
    { id: pkgName, overwrite: true }
  );

  return created;
}

export const saveKibanaAssetsRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>
) => {
  const assetRefs = Object.values(kibanaAssets).flat().map(toAssetReference);
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_kibana: assetRefs,
  });
  return assetRefs;
};

export const saveInstalledEsRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  installedAssets: EsAssetReference[]
) => {
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedAssetsToSave = installedPkg?.attributes.installed_es.concat(installedAssets);
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: installedAssetsToSave,
  });
  return installedAssets;
};

export const removeAssetTypesFromInstalledEs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  assetTypes: AssetType[]
) => {
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedAssets = installedPkg?.attributes.installed_es;
  if (!installedAssets?.length) return;
  const installedAssetsToSave = installedAssets?.filter(
    (asset) => !assetTypes.includes(asset.type)
  );

  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: installedAssetsToSave,
  });
};

export async function ensurePackagesCompletedInstall(
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const installingPackages = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['install_status'],
    search: 'installing',
  });
  const installingPromises = installingPackages.saved_objects.reduce<Array<Promise<InstallResult>>>(
    (acc, pkg) => {
      const startDate = pkg.attributes.install_started_at;
      const nowDate = new Date().toISOString();
      const elapsedTime = Date.parse(nowDate) - Date.parse(startDate);
      const pkgkey = `${pkg.attributes.name}-${pkg.attributes.install_version}`;
      // reinstall package
      if (elapsedTime > MAX_TIME_COMPLETE_INSTALL) {
        acc.push(
          installPackage({
            installSource: 'registry',
            savedObjectsClient,
            pkgkey,
            esClient,
          })
        );
      }
      return acc;
    },
    []
  );
  await Promise.all(installingPromises);
  return installingPackages;
}

interface NoPkgArgs {
  pkgVersion: string;
  installedPkg?: undefined;
}

interface HasPkgArgs {
  pkgVersion: string;
  installedPkg: SavedObject<Installation>;
}

type OnlyInstall = Extract<InstallType, 'install'>;
type NotInstall = Exclude<InstallType, 'install'>;

// overloads
export function getInstallType(args: NoPkgArgs): OnlyInstall;
export function getInstallType(args: HasPkgArgs): NotInstall;
export function getInstallType(args: NoPkgArgs | HasPkgArgs): OnlyInstall | NotInstall;

// implementation
export function getInstallType(args: NoPkgArgs | HasPkgArgs): OnlyInstall | NotInstall {
  const { pkgVersion, installedPkg } = args;
  if (!installedPkg) return 'install';

  const currentPkgVersion = installedPkg.attributes.version;
  const lastStartedInstallVersion = installedPkg.attributes.install_version;

  if (pkgVersion === currentPkgVersion && pkgVersion !== lastStartedInstallVersion)
    return 'rollback';
  if (pkgVersion === currentPkgVersion) return 'reinstall';
  if (pkgVersion === lastStartedInstallVersion && pkgVersion !== currentPkgVersion)
    return 'reupdate';
  if (pkgVersion !== lastStartedInstallVersion && pkgVersion !== currentPkgVersion) return 'update';
  throw new Error('unknown install type');
}
