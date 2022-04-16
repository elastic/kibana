/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';
import type Boom from '@hapi/boom';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { generateESIndexPatterns } from '../elasticsearch/template/template';
import type {
  BulkInstallPackageInfo,
  EpmPackageInstallStatus,
  InstallablePackage,
  InstallSource,
} from '../../../../common';
import { AUTO_UPGRADE_POLICIES_PACKAGES } from '../../../../common';
import { IngestManagerError, PackageOutdatedError } from '../../../errors';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
import type { KibanaAssetType } from '../../../types';
import { licenseService } from '../..';
import type {
  Installation,
  AssetType,
  EsAssetReference,
  InstallType,
  InstallResult,
} from '../../../types';
import { appContextService } from '../../app_context';
import * as Registry from '../registry';
import {
  setPackageInfo,
  generatePackageInfoFromArchiveBuffer,
  unpackBufferToCache,
} from '../archive';
import { toAssetReference } from '../kibana/assets/install';
import type { ArchiveAsset } from '../kibana/assets/install';

import type { PackageUpdateEvent } from '../../upgrade_sender';
import { sendTelemetryEvents, UpdateEventType } from '../../upgrade_sender';

import { getInstallation, getInstallationObject } from '.';
import { removeInstallation } from './remove';
import { getPackageSavedObjects } from './get';
import { _installPackage } from './_install_package';
import { removeOldAssets } from './cleanup';
import { getBundledPackages } from './bundled_packages';

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
  spaceId?: string;
}): Promise<Installation> {
  const { savedObjectsClient, pkgName, esClient, pkgVersion, spaceId = DEFAULT_SPACE_ID } = options;

  // If pkgVersion isn't specified, find the latest package version
  const pkgKeyProps = pkgVersion
    ? { name: pkgName, version: pkgVersion }
    : await Registry.fetchFindLatestPackageOrThrow(pkgName);

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
    spaceId,
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
  spaceId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  error: IngestManagerError | Boom.Boom | Error;
  pkgName: string;
  pkgVersion: string;
  installedPkg: SavedObject<Installation> | undefined;
  esClient: ElasticsearchClient;
  spaceId: string;
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
      logger.error(`uninstalling ${pkgkey} after error installing: [${error.toString()}]`);
      await removeInstallation({ savedObjectsClient, pkgName, pkgVersion, esClient });
    }

    await updateInstallStatus({ savedObjectsClient, pkgName, status: 'install_failed' });

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
        spaceId,
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
  spaceId: string;
  force?: boolean;
  ignoreConstraints?: boolean;
}

function getTelemetryEvent(pkgName: string, pkgVersion: string): PackageUpdateEvent {
  return {
    packageName: pkgName,
    currentVersion: 'unknown',
    newVersion: pkgVersion,
    status: 'failure',
    dryRun: false,
    eventType: UpdateEventType.PACKAGE_INSTALL,
    installType: 'unknown',
  };
}

function sendEvent(telemetryEvent: PackageUpdateEvent) {
  sendTelemetryEvents(
    appContextService.getLogger(),
    appContextService.getTelemetryEventsSender(),
    telemetryEvent
  );
}

async function installPackageFromRegistry({
  savedObjectsClient,
  pkgkey,
  esClient,
  spaceId,
  force = false,
  ignoreConstraints = false,
}: InstallRegistryPackageParams): Promise<InstallResult> {
  const logger = appContextService.getLogger();
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);

  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';

  const telemetryEvent: PackageUpdateEvent = getTelemetryEvent(pkgName, pkgVersion);

  try {
    // get the currently installed package
    const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
    installType = getInstallType({ pkgVersion, installedPkg });

    // get latest package version
    const latestPackage = await Registry.fetchFindLatestPackageOrThrow(pkgName, {
      ignoreConstraints,
    });

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
          installSource: 'registry',
        };
      }
    }

    telemetryEvent.installType = installType;
    telemetryEvent.currentVersion = installedPkg?.attributes.version || 'not_installed';

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

    if (!licenseService.hasAtLeast(packageInfo.license || 'basic')) {
      const err = new Error(`Requires ${packageInfo.license} license`);
      sendEvent({
        ...telemetryEvent,
        errorMessage: err.message,
      });
      return { error: err, installType, installSource: 'registry' };
    }

    const savedObjectsImporter = appContextService
      .getSavedObjects()
      .createImporter(savedObjectsClient);

    // try installing the package, if there was an error, call error handler and rethrow
    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return _installPackage({
      savedObjectsClient,
      savedObjectsImporter,
      esClient,
      logger,
      installedPkg,
      paths,
      packageInfo,
      installType,
      spaceId,
      installSource: 'registry',
    })
      .then(async (assets) => {
        await removeOldAssets({
          soClient: savedObjectsClient,
          pkgName: packageInfo.name,
          currentVersion: packageInfo.version,
        });
        sendEvent({
          ...telemetryEvent,
          status: 'success',
        });
        return { assets, status: 'installed', installType, installSource: 'registry' };
      })
      .catch(async (err: Error) => {
        logger.warn(`Failure to install package [${pkgName}]: [${err.toString()}]`);
        await handleInstallPackageFailure({
          savedObjectsClient,
          error: err,
          pkgName,
          pkgVersion,
          installedPkg,
          spaceId,
          esClient,
        });
        sendEvent({
          ...telemetryEvent,
          errorMessage: err.message,
        });
        return { error: err, installType, installSource: 'registry' };
      });
  } catch (e) {
    sendEvent({
      ...telemetryEvent,
      errorMessage: e.message,
    });
    return {
      error: e,
      installType,
      installSource: 'registry',
    };
  }
}

interface InstallUploadedArchiveParams {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  archiveBuffer: Buffer;
  contentType: string;
  spaceId: string;
}

async function installPackageByUpload({
  savedObjectsClient,
  esClient,
  archiveBuffer,
  contentType,
  spaceId,
}: InstallUploadedArchiveParams): Promise<InstallResult> {
  const logger = appContextService.getLogger();
  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';
  const telemetryEvent: PackageUpdateEvent = getTelemetryEvent('', '');
  try {
    const { packageInfo } = await generatePackageInfoFromArchiveBuffer(archiveBuffer, contentType);

    const installedPkg = await getInstallationObject({
      savedObjectsClient,
      pkgName: packageInfo.name,
    });

    installType = getInstallType({ pkgVersion: packageInfo.version, installedPkg });

    telemetryEvent.packageName = packageInfo.name;
    telemetryEvent.newVersion = packageInfo.version;
    telemetryEvent.installType = installType;
    telemetryEvent.currentVersion = installedPkg?.attributes.version || 'not_installed';

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

    const savedObjectsImporter = appContextService
      .getSavedObjects()
      .createImporter(savedObjectsClient);

    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return _installPackage({
      savedObjectsClient,
      savedObjectsImporter,
      esClient,
      logger,
      installedPkg,
      paths,
      packageInfo,
      installType,
      installSource,
      spaceId,
    })
      .then((assets) => {
        sendEvent({
          ...telemetryEvent,
          status: 'success',
        });
        return { assets, status: 'installed', installType };
      })
      .catch(async (err: Error) => {
        sendEvent({
          ...telemetryEvent,
          errorMessage: err.message,
        });
        return { error: err, installType };
      });
  } catch (e) {
    sendEvent({
      ...telemetryEvent,
      errorMessage: e.message,
    });
    return { error: e, installType, installSource: 'upload' };
  }
}

export type InstallPackageParams = {
  spaceId: string;
} & (
  | ({ installSource: Extract<InstallSource, 'registry'> } & InstallRegistryPackageParams)
  | ({ installSource: Extract<InstallSource, 'upload'> } & InstallUploadedArchiveParams)
  | ({ installSource: Extract<InstallSource, 'bundled'> } & InstallUploadedArchiveParams)
);

export async function installPackage(args: InstallPackageParams): Promise<InstallResult> {
  if (!('installSource' in args)) {
    throw new Error('installSource is required');
  }

  const logger = appContextService.getLogger();
  const { savedObjectsClient, esClient } = args;

  const bundledPackages = await getBundledPackages();

  if (args.installSource === 'registry') {
    const { pkgkey, force, ignoreConstraints, spaceId } = args;

    const matchingBundledPackage = bundledPackages.find(
      (pkg) => Registry.pkgToPkgKey(pkg) === pkgkey
    );

    if (matchingBundledPackage) {
      logger.debug(
        `found bundled package for requested install of ${pkgkey} - installing from bundled package archive`
      );

      const response = await installPackageByUpload({
        savedObjectsClient,
        esClient,
        archiveBuffer: matchingBundledPackage.buffer,
        contentType: 'application/zip',
        spaceId,
      });

      return { ...response, installSource: 'bundled' };
    }

    logger.debug(`kicking off install of ${pkgkey} from registry`);
    const response = await installPackageFromRegistry({
      savedObjectsClient,
      pkgkey,
      esClient,
      spaceId,
      force,
      ignoreConstraints,
    });
    return response;
  } else if (args.installSource === 'upload') {
    const { archiveBuffer, contentType, spaceId } = args;
    const response = await installPackageByUpload({
      savedObjectsClient,
      esClient,
      archiveBuffer,
      contentType,
      spaceId,
    });
    return response;
  }
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

export const updateInstallStatus = async ({
  savedObjectsClient,
  pkgName,
  status,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  status: EpmPackageInstallStatus;
}) => {
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    install_status: status,
  });
};

export async function createInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  packageInfo: InstallablePackage;
  installSource: InstallSource;
  spaceId: string;
}) {
  const { savedObjectsClient, packageInfo, installSource } = options;
  const { name: pkgName, version: pkgVersion } = packageInfo;
  const toSaveESIndexPatterns = generateESIndexPatterns(packageInfo.data_streams);

  // For "stack-aligned" packages, default the `keep_policies_up_to_date` setting to true. For all other
  // packages, default it to undefined. Use undefined rather than false to allow us to differentiate
  // between "unset" and "user explicitly disabled".
  const defaultKeepPoliciesUpToDate = AUTO_UPGRADE_POLICIES_PACKAGES.some(
    ({ name }) => name === packageInfo.name
  )
    ? true
    : undefined;

  // TODO cleanup removable flag and isUnremovablePackage function
  const created = await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed_kibana: [],
      installed_kibana_space_id: options.spaceId,
      installed_es: [],
      package_assets: [],
      es_index_patterns: toSaveESIndexPatterns,
      name: pkgName,
      version: pkgVersion,
      removable: true,
      install_version: pkgVersion,
      install_status: 'installing',
      install_started_at: new Date().toISOString(),
      install_source: installSource,
      keep_policies_up_to_date: defaultKeepPoliciesUpToDate,
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

  const deduplicatedAssets =
    installedAssetsToSave?.reduce((acc, currentAsset) => {
      const foundAsset = acc.find((asset: EsAssetReference) => asset.id === currentAsset.id);
      if (!foundAsset) {
        return acc.concat([currentAsset]);
      } else {
        return acc;
      }
    }, [] as EsAssetReference[]) || [];

  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: deduplicatedAssets,
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
            spaceId: pkg.attributes.installed_kibana_space_id || DEFAULT_SPACE_ID,
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
