/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import semver from 'semver';
import Boom from 'boom';
import { UnwrapPromise } from '@kbn/utility-types';
import { BulkInstallPackageInfo, InstallSource } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
import {
  AssetReference,
  Installation,
  CallESAsCurrentUser,
  DefaultPackages,
  AssetType,
  KibanaAssetReference,
  EsAssetReference,
  InstallType,
} from '../../../types';
import * as Registry from '../registry';
import {
  getInstallation,
  getInstallationObject,
  isRequiredPackage,
  bulkInstallPackages,
  isBulkInstallError,
} from './index';
import { toAssetReference, ArchiveAsset } from '../kibana/assets/install';
import { removeInstallation } from './remove';
import {
  IngestManagerError,
  PackageOperationNotSupportedError,
  PackageOutdatedError,
} from '../../../errors';
import { getPackageSavedObjects } from './get';
import { appContextService } from '../../app_context';
import { loadArchivePackage } from '../archive';
import { _installPackage } from './_install_package';

export async function installLatestPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  try {
    const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPackage.name,
      version: latestPackage.version,
    });
    return installPackageFromRegistry({ savedObjectsClient, pkgkey, callCluster });
  } catch (err) {
    throw err;
  }
}

export async function ensureInstalledDefaultPackages(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<Installation[]> {
  const installations = [];
  const bulkResponse = await bulkInstallPackages({
    savedObjectsClient,
    packagesToUpgrade: Object.values(DefaultPackages),
    callCluster,
  });

  for (const resp of bulkResponse) {
    if (isBulkInstallError(resp)) {
      throw resp.error;
    } else {
      installations.push(getInstallation({ savedObjectsClient, pkgName: resp.name }));
    }
  }

  const retrievedInstallations = await Promise.all(installations);
  return retrievedInstallations.map((installation, index) => {
    if (!installation) {
      throw new Error(`could not get installation ${bulkResponse[index].name}`);
    }
    return installation;
  });
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<Installation> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const installedPackage = await getInstallation({ savedObjectsClient, pkgName });
  if (installedPackage) {
    return installedPackage;
  }
  // if the requested packaged was not found to be installed, install
  await installLatestPackage({
    savedObjectsClient,
    pkgName,
    callCluster,
  });
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
  callCluster,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  error: IngestManagerError | Boom | Error;
  pkgName: string;
  pkgVersion: string;
  installedPkg: SavedObject<Installation> | undefined;
  callCluster: CallESAsCurrentUser;
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
      await removeInstallation({ savedObjectsClient, pkgkey, callCluster });
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
      await installPackageFromRegistry({
        savedObjectsClient,
        pkgkey: prevVersion,
        callCluster,
      });
    }
  } catch (e) {
    logger.error(`failed to uninstall or rollback package after installation error ${e}`);
  }
}

export interface IBulkInstallPackageError {
  name: string;
  error: Error;
}
export type BulkInstallResponse = BulkInstallPackageInfo | IBulkInstallPackageError;

interface UpgradePackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  installedPkg: UnwrapPromise<ReturnType<typeof getInstallationObject>>;
  latestPkg: UnwrapPromise<ReturnType<typeof Registry.fetchFindLatestPackage>>;
  pkgToUpgrade: string;
}
export async function upgradePackage({
  savedObjectsClient,
  callCluster,
  installedPkg,
  latestPkg,
  pkgToUpgrade,
}: UpgradePackageParams): Promise<BulkInstallResponse> {
  if (!installedPkg || semver.gt(latestPkg.version, installedPkg.attributes.version)) {
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPkg.name,
      version: latestPkg.version,
    });

    try {
      const assets = await installPackageFromRegistry({ savedObjectsClient, pkgkey, callCluster });
      return {
        name: pkgToUpgrade,
        newVersion: latestPkg.version,
        oldVersion: installedPkg?.attributes.version ?? null,
        assets,
      };
    } catch (installFailed) {
      await handleInstallPackageFailure({
        savedObjectsClient,
        error: installFailed,
        pkgName: latestPkg.name,
        pkgVersion: latestPkg.version,
        installedPkg,
        callCluster,
      });
      return { name: pkgToUpgrade, error: installFailed };
    }
  } else {
    // package was already at the latest version
    return {
      name: pkgToUpgrade,
      newVersion: latestPkg.version,
      oldVersion: latestPkg.version,
      assets: [
        ...installedPkg.attributes.installed_es,
        ...installedPkg.attributes.installed_kibana,
      ],
    };
  }
}

interface InstallPackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
  force?: boolean;
}

export async function installPackageFromRegistry({
  savedObjectsClient,
  pkgkey,
  callCluster,
  force = false,
}: InstallPackageParams): Promise<AssetReference[]> {
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
  // get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });

  const installType = getInstallType({ pkgVersion, installedPkg });

  // let the user install if using the force flag or needing to reinstall or install a previous version due to failed update
  const installOutOfDateVersionOk =
    installType === 'reinstall' || installType === 'reupdate' || installType === 'rollback';
  if (semver.lt(pkgVersion, latestPackage.version) && !force && !installOutOfDateVersionOk) {
    throw new PackageOutdatedError(`${pkgkey} is out-of-date and cannot be installed or updated`);
  }

  const { paths, registryPackageInfo } = await Registry.loadRegistryPackage(pkgName, pkgVersion);

  const removable = !isRequiredPackage(pkgName);
  const { internal = false } = registryPackageInfo;
  const installSource = 'registry';

  return _installPackage({
    savedObjectsClient,
    callCluster,
    pkgName,
    pkgVersion,
    installedPkg,
    paths,
    removable,
    internal,
    packageInfo: registryPackageInfo,
    installType,
    installSource,
  });
}

export async function installPackageByUpload({
  savedObjectsClient,
  callCluster,
  archiveBuffer,
  contentType,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  archiveBuffer: Buffer;
  contentType: string;
}): Promise<AssetReference[]> {
  const { paths, archivePackageInfo } = await loadArchivePackage({ archiveBuffer, contentType });
  const installedPkg = await getInstallationObject({
    savedObjectsClient,
    pkgName: archivePackageInfo.name,
  });
  const installType = getInstallType({ pkgVersion: archivePackageInfo.version, installedPkg });
  if (installType !== 'install') {
    throw new PackageOperationNotSupportedError(
      `Package upload only supports fresh installations. Package ${archivePackageInfo.name} is already installed, please uninstall first.`
    );
  }

  const removable = !isRequiredPackage(archivePackageInfo.name);
  const { internal = false } = archivePackageInfo;
  const installSource = 'upload';

  return _installPackage({
    savedObjectsClient,
    callCluster,
    pkgName: archivePackageInfo.name,
    pkgVersion: archivePackageInfo.version,
    installedPkg,
    paths,
    removable,
    internal,
    packageInfo: archivePackageInfo,
    installType,
    installSource,
  });
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
  pkgName: string;
  pkgVersion: string;
  internal: boolean;
  removable: boolean;
  installed_kibana: KibanaAssetReference[];
  installed_es: EsAssetReference[];
  toSaveESIndexPatterns: Record<string, string>;
  installSource: InstallSource;
}) {
  const {
    savedObjectsClient,
    pkgName,
    pkgVersion,
    internal,
    removable,
    installed_kibana: installedKibana,
    installed_es: installedEs,
    toSaveESIndexPatterns,
    installSource,
  } = options;
  await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed_kibana: installedKibana,
      installed_es: installedEs,
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
  return [...installedKibana, ...installedEs];
}

export const saveKibanaAssetsRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  kibanaAssets: ArchiveAsset[]
) => {
  const assetRefs = kibanaAssets.map(toAssetReference);
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

export const removeAssetsFromInstalledEsByType = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  assetType: AssetType
) => {
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedAssets = installedPkg?.attributes.installed_es;
  if (!installedAssets?.length) return;
  const installedAssetsToSave = installedAssets?.filter(({ id, type }) => {
    return type !== assetType;
  });

  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: installedAssetsToSave,
  });
};

export async function ensurePackagesCompletedInstall(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const installingPackages = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['install_status'],
    search: 'installing',
  });
  const installingPromises = installingPackages.saved_objects.reduce<
    Array<Promise<AssetReference[]>>
  >((acc, pkg) => {
    const startDate = pkg.attributes.install_started_at;
    const nowDate = new Date().toISOString();
    const elapsedTime = Date.parse(nowDate) - Date.parse(startDate);
    const pkgkey = `${pkg.attributes.name}-${pkg.attributes.install_version}`;
    // reinstall package
    if (elapsedTime > MAX_TIME_COMPLETE_INSTALL) {
      acc.push(installPackageFromRegistry({ savedObjectsClient, pkgkey, callCluster }));
    }
    return acc;
  }, []);
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
