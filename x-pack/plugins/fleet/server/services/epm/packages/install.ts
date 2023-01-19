/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';
import type Boom from '@hapi/boom';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import pRetry from 'p-retry';

import { isPackagePrerelease } from '../../../../common/services';

import { FLEET_INSTALL_FORMAT_VERSION } from '../../../constants/fleet_es_assets';

import { generateESIndexPatterns } from '../elasticsearch/template/template';

import type {
  BulkInstallPackageInfo,
  EpmPackageInstallStatus,
  EsAssetReference,
  InstallablePackage,
  Installation,
  InstallResult,
  InstallSource,
  InstallType,
  KibanaAssetType,
  PackageVerificationResult,
} from '../../../types';
import { AUTO_UPGRADE_POLICIES_PACKAGES } from '../../../../common/constants';
import { FleetError, PackageOutdatedError } from '../../../errors';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
import { licenseService } from '../..';
import { appContextService } from '../../app_context';
import * as Registry from '../registry';
import {
  setPackageInfo,
  generatePackageInfoFromArchiveBuffer,
  unpackBufferToCache,
  deleteVerificationResult,
} from '../archive';
import { toAssetReference } from '../kibana/assets/install';
import type { ArchiveAsset } from '../kibana/assets/install';

import type { PackageUpdateEvent } from '../../upgrade_sender';
import { sendTelemetryEvents, UpdateEventType } from '../../upgrade_sender';

import { formatVerificationResultForSO } from './package_verification';

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
  force?: boolean;
}): Promise<Installation> {
  const {
    savedObjectsClient,
    pkgName,
    esClient,
    pkgVersion,
    force = false,
    spaceId = DEFAULT_SPACE_ID,
  } = options;

  // If pkgVersion isn't specified, find the latest package version
  const pkgKeyProps = pkgVersion
    ? { name: pkgName, version: pkgVersion }
    : await Registry.fetchFindLatestPackageOrThrow(pkgName, { prerelease: true });

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
    neverIgnoreVerificationError: !force,
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
    installResult.error.message = `${errorPrefix}: ${installResult.error.message}`;
    throw installResult.error;
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
  error: FleetError | Boom.Boom | Error;
  pkgName: string;
  pkgVersion: string;
  installedPkg: SavedObject<Installation> | undefined;
  esClient: ElasticsearchClient;
  spaceId: string;
}) {
  if (error instanceof FleetError) {
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
  neverIgnoreVerificationError?: boolean;
  ignoreConstraints?: boolean;
  prerelease?: boolean;
}
interface InstallUploadedArchiveParams {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  archiveBuffer: Buffer;
  contentType: string;
  spaceId: string;
  version?: string;
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
  neverIgnoreVerificationError = false,
  prerelease = false,
}: InstallRegistryPackageParams): Promise<InstallResult> {
  const logger = appContextService.getLogger();
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion: version } = Registry.splitPkgKey(pkgkey);
  let pkgVersion = version;

  // Workaround apm issue with async spans: https://github.com/elastic/apm-agent-nodejs/issues/2611
  await Promise.resolve();
  const span = apm.startSpan(`Install package from registry ${pkgName}@${pkgVersion}`, 'package');

  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';

  const telemetryEvent: PackageUpdateEvent = getTelemetryEvent(pkgName, pkgVersion);

  try {
    // get the currently installed package
    const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
    installType = getInstallType({ pkgVersion, installedPkg });

    span?.addLabels({
      packageName: pkgName,
      packageVersion: pkgVersion,
      installType,
    });

    const queryLatest = () =>
      Registry.fetchFindLatestPackageOrThrow(pkgName, {
        ignoreConstraints,
        prerelease: prerelease === true || isPackagePrerelease(pkgVersion), // fetching latest GA version if the package to install is GA, so that it is allowed to install
      });

    let latestPkg;
    // fetching latest package first to set the version
    if (!pkgVersion) {
      latestPkg = await queryLatest();
      pkgVersion = latestPkg.version;
    }

    // get latest package version and requested version in parallel for performance
    const [latestPackage, { paths, packageInfo, verificationResult }] = await Promise.all([
      latestPkg ? Promise.resolve(latestPkg) : queryLatest(),
      Registry.getPackage(pkgName, pkgVersion, {
        ignoreUnverified: force && !neverIgnoreVerificationError,
      }),
    ]);

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

    const savedObjectTagAssignmentService = appContextService
      .getSavedObjectsTagging()
      .createInternalAssignmentService({ client: savedObjectsClient });

    const savedObjectTagClient = appContextService
      .getSavedObjectsTagging()
      .createTagClient({ client: savedObjectsClient });

    // try installing the package, if there was an error, call error handler and rethrow
    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return await _installPackage({
      savedObjectsClient,
      savedObjectsImporter,
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      esClient,
      logger,
      installedPkg,
      paths,
      packageInfo,
      installType,
      spaceId,
      verificationResult,
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
  } finally {
    span?.end();
  }
}

async function installPackageByUpload({
  savedObjectsClient,
  esClient,
  archiveBuffer,
  contentType,
  spaceId,
  version,
}: InstallUploadedArchiveParams): Promise<InstallResult> {
  // Workaround apm issue with async spans: https://github.com/elastic/apm-agent-nodejs/issues/2611
  await Promise.resolve();
  const span = apm.startSpan(`Install package from upload`, 'package');

  const logger = appContextService.getLogger();
  // if an error happens during getInstallType, report that we don't know
  let installType: InstallType = 'unknown';
  const telemetryEvent: PackageUpdateEvent = getTelemetryEvent('', '');
  try {
    const { packageInfo } = await generatePackageInfoFromArchiveBuffer(archiveBuffer, contentType);

    // Allow for overriding the version in the manifest for cases where we install
    // stack-aligned bundled packages to support special cases around the
    // `forceAlignStackVersion` flag in `fleet_packages.json`.
    const pkgVersion = version || packageInfo.version;

    const installedPkg = await getInstallationObject({
      savedObjectsClient,
      pkgName: packageInfo.name,
    });

    installType = getInstallType({ pkgVersion, installedPkg });

    span?.addLabels({
      packageName: packageInfo.name,
      packageVersion: pkgVersion,
      installType,
    });

    telemetryEvent.packageName = packageInfo.name;
    telemetryEvent.newVersion = pkgVersion;
    telemetryEvent.installType = installType;
    telemetryEvent.currentVersion = installedPkg?.attributes.version || 'not_installed';

    const installSource = 'upload';
    // as we do not verify uploaded packages, we must invalidate the verification cache
    deleteVerificationResult(packageInfo);
    const paths = await unpackBufferToCache({
      name: packageInfo.name,
      version: pkgVersion,
      archiveBuffer,
      contentType,
    });

    setPackageInfo({
      name: packageInfo.name,
      version: pkgVersion,
      packageInfo,
    });

    const savedObjectsImporter = appContextService
      .getSavedObjects()
      .createImporter(savedObjectsClient);

    const savedObjectTagAssignmentService = appContextService
      .getSavedObjectsTagging()
      .createInternalAssignmentService({ client: savedObjectsClient });

    const savedObjectTagClient = appContextService
      .getSavedObjectsTagging()
      .createTagClient({ client: savedObjectsClient });

    // @ts-expect-error status is string instead of InstallResult.status 'installed' | 'already_installed'
    return await _installPackage({
      savedObjectsClient,
      savedObjectsImporter,
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      esClient,
      logger,
      installedPkg,
      paths,
      packageInfo: { ...packageInfo, version: pkgVersion },
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
  } finally {
    span?.end();
  }
}

export type InstallPackageParams = {
  spaceId: string;
  neverIgnoreVerificationError?: boolean;
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
    const { pkgkey, force, ignoreConstraints, spaceId, neverIgnoreVerificationError, prerelease } =
      args;

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
        version: matchingBundledPackage.version,
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
      neverIgnoreVerificationError,
      ignoreConstraints,
      prerelease,
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

export async function restartInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  installSource: InstallSource;
  verificationResult?: PackageVerificationResult;
}) {
  const { savedObjectsClient, pkgVersion, pkgName, installSource, verificationResult } = options;

  let savedObjectUpdate: Partial<Installation> = {
    install_version: pkgVersion,
    install_status: 'installing',
    install_started_at: new Date().toISOString(),
    install_source: installSource,
  };

  if (verificationResult) {
    savedObjectUpdate = {
      ...savedObjectUpdate,
      verification_key_id: null, // unset any previous verification key id
      ...formatVerificationResultForSO(verificationResult),
    };
  }

  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, savedObjectUpdate);
}

export async function createInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  packageInfo: InstallablePackage;
  installSource: InstallSource;
  spaceId: string;
  verificationResult?: PackageVerificationResult;
}) {
  const { savedObjectsClient, packageInfo, installSource, verificationResult } = options;
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

  let savedObject: Installation = {
    installed_kibana: [],
    installed_kibana_space_id: options.spaceId,
    installed_es: [],
    package_assets: [],
    es_index_patterns: toSaveESIndexPatterns,
    name: pkgName,
    version: pkgVersion,
    install_version: pkgVersion,
    install_status: 'installing',
    install_started_at: new Date().toISOString(),
    install_source: installSource,
    install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
    keep_policies_up_to_date: defaultKeepPoliciesUpToDate,
    verification_status: 'unknown',
  };

  if (verificationResult) {
    savedObject = { ...savedObject, ...formatVerificationResultForSO(verificationResult) };
  }

  const created = await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    savedObject,
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
  // Because Kibana assets are installed in parallel with ES assets with refresh: false, we almost always run into an
  // issue that causes a conflict error due to this issue: https://github.com/elastic/kibana/issues/126240. This is safe
  // to retry constantly until it succeeds to optimize this critical user journey path as much as possible.
  pRetry(
    () =>
      savedObjectsClient.update(
        PACKAGES_SAVED_OBJECT_TYPE,
        pkgName,
        {
          installed_kibana: assetRefs,
        },
        { refresh: false }
      ),
    { retries: 20 } // Use a number of retries higher than the number of es asset update operations
  );

  return assetRefs;
};

/**
 * Utility function for updating the installed_es field of a package
 */
export const updateEsAssetReferences = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  currentAssets: EsAssetReference[],
  {
    assetsToAdd = [],
    assetsToRemove = [],
    refresh = false,
  }: {
    assetsToAdd?: EsAssetReference[];
    assetsToRemove?: EsAssetReference[];
    /**
     * Whether or not the update should force a refresh on the SO index.
     * Defaults to `false` for faster updates, should only be `wait_for` if the update needs to be queried back from ES
     * immediately.
     */
    refresh?: 'wait_for' | false;
  }
): Promise<EsAssetReference[]> => {
  const withAssetsRemoved = currentAssets.filter(({ type, id }) => {
    if (
      assetsToRemove.some(
        ({ type: removeType, id: removeId }) => removeType === type && removeId === id
      )
    ) {
      return false;
    }
    return true;
  });

  const deduplicatedAssets =
    [...withAssetsRemoved, ...assetsToAdd].reduce((acc, currentAsset) => {
      const foundAsset = acc.find((asset: EsAssetReference) => asset.id === currentAsset.id);
      if (!foundAsset) {
        return acc.concat([currentAsset]);
      } else {
        return acc;
      }
    }, [] as EsAssetReference[]) || [];

  const {
    attributes: { installed_es: updatedAssets },
  } =
    // Because Kibana assets are installed in parallel with ES assets with refresh: false, we almost always run into an
    // issue that causes a conflict error due to this issue: https://github.com/elastic/kibana/issues/126240. This is safe
    // to retry constantly until it succeeds to optimize this critical user journey path as much as possible.
    await pRetry(
      () =>
        savedObjectsClient.update<Installation>(
          PACKAGES_SAVED_OBJECT_TYPE,
          pkgName,
          {
            installed_es: deduplicatedAssets,
          },
          {
            refresh,
          }
        ),
      // Use a lower number of retries for ES assets since they're installed in serial and can only conflict with
      // the single Kibana update call.
      { retries: 5 }
    );

  return updatedAssets ?? [];
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
