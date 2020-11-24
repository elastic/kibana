/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import semverGt from 'semver/functions/gt';
import semverLt from 'semver/functions/lt';
import Boom from '@hapi/boom';
import { UnwrapPromise } from '@kbn/utility-types';
import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { generateESIndexPatterns } from '../elasticsearch/template/template';
import { isRequiredPackage } from './index';
import {
  BulkInstallPackageInfo,
  InstallablePackage,
  InstallSource,
  defaultPackages,
} from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
import {
  AssetReference,
  Installation,
  CallESAsCurrentUser,
  AssetType,
  EsAssetReference,
  InstallType,
  KibanaAssetType,
} from '../../../types';
import * as Registry from '../registry';
import { setPackageInfo, parseAndVerifyArchiveEntries, unpackBufferToCache } from '../archive';
import {
  getInstallation,
  getInstallationObject,
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
    return installPackage({ installSource: 'registry', savedObjectsClient, pkgkey, callCluster });
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
    packagesToUpgrade: Object.values(defaultPackages),
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
      await installPackage({
        installSource: 'registry',
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
  if (!installedPkg || semverGt(latestPkg.version, installedPkg.attributes.version)) {
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPkg.name,
      version: latestPkg.version,
    });

    try {
      const assets = await installPackage({
        installSource: 'registry',
        savedObjectsClient,
        pkgkey,
        callCluster,
      });
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

interface InstallRegistryPackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
  force?: boolean;
}

async function installPackageFromRegistry({
  savedObjectsClient,
  pkgkey,
  callCluster,
  force = false,
}: InstallRegistryPackageParams): Promise<AssetReference[]> {
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);
  // get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installType = getInstallType({ pkgVersion, installedPkg });
  // let the user install if using the force flag or needing to reinstall or install a previous version due to failed update
  const installOutOfDateVersionOk =
    installType === 'reinstall' || installType === 'reupdate' || installType === 'rollback';

  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
  if (semverLt(pkgVersion, latestPackage.version) && !force && !installOutOfDateVersionOk) {
    throw new PackageOutdatedError(`${pkgkey} is out-of-date and cannot be installed or updated`);
  }

  const { paths, packageInfo } = await Registry.getRegistryPackage(pkgName, pkgVersion);

  return _installPackage({
    savedObjectsClient,
    callCluster,
    installedPkg,
    paths,
    packageInfo,
    installType,
    installSource: 'registry',
  });
}

interface InstallUploadedArchiveParams {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  archiveBuffer: Buffer;
  contentType: string;
}

export type InstallPackageParams =
  | ({ installSource: Extract<InstallSource, 'registry'> } & InstallRegistryPackageParams)
  | ({ installSource: Extract<InstallSource, 'upload'> } & InstallUploadedArchiveParams);

async function installPackageByUpload({
  savedObjectsClient,
  callCluster,
  archiveBuffer,
  contentType,
}: InstallUploadedArchiveParams): Promise<AssetReference[]> {
  const { packageInfo } = await parseAndVerifyArchiveEntries(archiveBuffer, contentType);

  const installedPkg = await getInstallationObject({
    savedObjectsClient,
    pkgName: packageInfo.name,
  });

  const installType = getInstallType({ pkgVersion: packageInfo.version, installedPkg });
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

  return _installPackage({
    savedObjectsClient,
    callCluster,
    installedPkg,
    paths,
    packageInfo,
    installType,
    installSource,
  });
}

export async function installPackage(args: InstallPackageParams) {
  if (!('installSource' in args)) {
    throw new Error('installSource is required');
  }

  if (args.installSource === 'registry') {
    const { savedObjectsClient, pkgkey, callCluster, force } = args;

    return installPackageFromRegistry({
      savedObjectsClient,
      pkgkey,
      callCluster,
      force,
    });
  } else if (args.installSource === 'upload') {
    const { savedObjectsClient, callCluster, archiveBuffer, contentType } = args;

    return installPackageByUpload({
      savedObjectsClient,
      callCluster,
      archiveBuffer,
      contentType,
    });
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
  const removable = !isRequiredPackage(pkgName);
  const toSaveESIndexPatterns = generateESIndexPatterns(packageInfo.data_streams);

  const created = await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed_kibana: [],
      installed_es: [],
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
      acc.push(
        installPackage({ installSource: 'registry', savedObjectsClient, pkgkey, callCluster })
      );
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
